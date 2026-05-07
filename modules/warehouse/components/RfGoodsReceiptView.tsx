"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { appEnv } from "@/lib/config/env";
import { ManualBarcodeInput } from "@/modules/rf/components/ManualBarcodeInput";
import { RFScannerOverlay } from "@/modules/rf/components/RFScannerOverlay";
import { useBarcodeScanner } from "@/modules/rf/hooks/useBarcodeScanner";
import { useNetworkStatus } from "@/modules/rf/hooks/useNetworkStatus";
import { formatRFConfirmSummary } from "@/modules/rf/mappers/rfApiMapper";
import { normalizeRFError } from "@/modules/rf/services/rfError";
import {
    completeRFReception,
    isRFTransientError,
    openRFReception,
    rfConfirm,
    rfScan,
} from "@/modules/rf/services/rfService";
import { trackRFEvent } from "@/modules/rf/services/rfTelemetry";
import { setRFDetected, setRFError, setRFState } from "@/modules/rf/store/useRFStore";
import type { RFScanResult } from "@/modules/rf/types/rfTypes";
import {
    getInventoryReceptionDetail,
    listActiveInventoryReceptions,
} from "@/modules/warehouse/api/operatorInventoryApi";
import type {
    ActiveReceptionConflictDetails,
    ReceptionExpectedLine,
} from "@/modules/warehouse/api/operatorInventoryTypes";
import {
    enqueueRFConfirmation,
    listRFQueuedConfirmations,
    removeRFQueuedConfirmation,
} from "@/modules/rf/utils/offlineQueue";
import { listWarehouses, type ManagedWarehouse } from "@/modules/infrastructure";
import { StorageSpaceLocationPicker } from "@/modules/warehouse/components/StorageSpaceLocationPicker";
import { isApiError } from "@/shared/api/apiError";

export function RfGoodsReceiptView() {
    const formId = useId();
    const videoRef = useRef<HTMLVideoElement>(null);
    const searchParams = useSearchParams();
    const preferredWarehouseId = searchParams.get("warehouseId");
    const preferredReceptionId = searchParams.get("receptionId");
    const documentRef = searchParams.get("documentRef");
    const supplier = searchParams.get("supplier");

    const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
    const [warehouseId, setWarehouseId] = useState("");
    const [loadWarehousesError, setLoadWarehousesError] = useState<string | null>(null);

    const [receptionId, setReceptionId] = useState<number | null>(null);
    const [receptionStatus, setReceptionStatus] = useState<string | null>(null);
    const [sessionBusy, setSessionBusy] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    const [lastCode, setLastCode] = useState("");
    const [manualCode, setManualCode] = useState("");
    const [receptionLineId, setReceptionLineId] = useState<number | null>(null);
    const [productName, setProductName] = useState("");
    const [externalProductRef, setExternalProductRef] = useState<string | null>(null);
    const [productSku, setProductSku] = useState<string | null>(null);
    const [expectedQuantity, setExpectedQuantity] = useState<number | null>(null);
    const [requiresLot, setRequiresLot] = useState(false);
    const [suggestedStorageSpaceCode, setSuggestedStorageSpaceCode] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const [quantity, setQuantity] = useState(1);
    const [lotCode, setLotCode] = useState("");
    const [storageSpaceId, setStorageSpaceId] = useState("");
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    const [completeStorageId, setCompleteStorageId] = useState("");
    const [completeBusy, setCompleteBusy] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [detectorHint, setDetectorHint] = useState<string | null>(null);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<"synced" | "pending" | "syncing" | "error">("synced");
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [expectedLines, setExpectedLines] = useState<ReceptionExpectedLine[]>([]);
    const [expectedLinesBusy, setExpectedLinesBusy] = useState(false);
    const [expectedLinesError, setExpectedLinesError] = useState<string | null>(null);
    const { isOnline } = useNetworkStatus();
    const confirmStartedAtRef = useRef<number | null>(null);
    const openReceptionAttemptRef = useRef<{
        warehouseId: number;
        clientRequestId: string;
        createdAt: number;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await listWarehouses();
                if (!cancelled) {
                    setWarehouses(list);
                    setWarehouseId((prev) => {
                        if (prev) return prev;
                        if (preferredWarehouseId) {
                            const exists = list.some(
                                (warehouse) => warehouse.id === preferredWarehouseId
                            );
                            if (exists) {
                                return preferredWarehouseId;
                            }
                        }
                        return list[0]?.id ?? "";
                    });
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadWarehousesError(normalizeRFError(e).message);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [preferredWarehouseId]);

    const warehouseOptions = warehouses.map((w) => ({
        value: w.id,
        label: `${w.name} (${w.code})`,
    }));

    const expectedSummary = useMemo(() => {
        let pending = 0;
        let partial = 0;
        let complete = 0;
        let excess = 0;
        for (const line of expectedLines) {
            if (line.receivedQuantity <= 0) {
                pending += 1;
                continue;
            }
            if (line.receivedQuantity < line.expectedQuantity) {
                partial += 1;
                continue;
            }
            if (line.receivedQuantity === line.expectedQuantity) {
                complete += 1;
                continue;
            }
            excess += 1;
        }
        return { pending, partial, complete, excess };
    }, [expectedLines]);

    const refreshExpectedLines = useCallback(async (targetReceptionId: number) => {
        setExpectedLinesBusy(true);
        setExpectedLinesError(null);
        try {
            const detail = await getInventoryReceptionDetail(targetReceptionId);
            setExpectedLines(
                detail.lines.filter((line) => Number.isFinite(line.receptionLineId) && line.receptionLineId > 0)
            );
        } catch (e) {
            setExpectedLines([]);
            setExpectedLinesError(normalizeRFError(e).message);
        } finally {
            setExpectedLinesBusy(false);
        }
    }, []);

    useEffect(() => {
        if (!preferredReceptionId) return;
        const rid = Number.parseInt(preferredReceptionId, 10);
        if (!Number.isFinite(rid) || rid <= 0) return;
        setReceptionId((prev) => (prev ?? rid));
        setRFState("idle");
        if (!receptionStatus) {
            setReceptionStatus("OPEN");
        }
        void refreshExpectedLines(rid);
    }, [preferredReceptionId, receptionStatus, refreshExpectedLines]);

    const syncPendingConfirmations = useCallback(async () => {
        if (!isOnline) return;
        try {
            const queue = await listRFQueuedConfirmations();
            setPendingSyncCount(queue.length);
            if (queue.length === 0) {
                setSyncStatus("synced");
                setSyncMessage(null);
                return;
            }

            setSyncStatus("syncing");
            setSyncMessage("Reintentando confirmaciones pendientes…");

            let synced = 0;
            for (const item of queue) {
                try {
                    await rfConfirm(item.payload);
                    await removeRFQueuedConfirmation(item.id);
                    synced += 1;
                } catch {
                    setSyncStatus("error");
                    setSyncMessage("No se pudieron sincronizar todas las confirmaciones pendientes.");
                    break;
                }
            }

            const remaining = (await listRFQueuedConfirmations()).length;
            setPendingSyncCount(remaining);
            if (remaining === 0) {
                setSyncStatus("synced");
                setSyncMessage(
                    synced > 0 ? `Sincronización completada (${synced} confirmación(es)).` : null
                );
            } else {
                setSyncStatus("pending");
            }
        } catch {
            setSyncStatus("error");
            setSyncMessage("No fue posible consultar la cola offline en este dispositivo.");
        }
    }, [isOnline]);

    useEffect(() => {
        void syncPendingConfirmations();
    }, [syncPendingConfirmations]);

    useEffect(() => {
        if (!isOnline) {
            setSyncStatus("pending");
            setSyncMessage("Sin conexión. Las confirmaciones nuevas se pondrán en cola.");
        } else if (pendingSyncCount > 0) {
            setSyncMessage("Conexión recuperada. Iniciando sincronización de pendientes.");
            void syncPendingConfirmations();
        }
    }, [isOnline, pendingSyncCount, syncPendingConfirmations]);

    async function onOpenReception() {
        setSessionError(null);
        const wid = Number.parseInt(warehouseId, 10);
        if (!Number.isFinite(wid)) {
            setSessionError("Selecciona una bodega válida.");
            return;
        }
        setSessionBusy(true);
        try {
            // Resume-first: si ya existe activa para la bodega, retómala sin intentar crear otra.
            const activeReceptions = await listActiveInventoryReceptions(wid);
            const active = activeReceptions[0];
            if (active) {
                setReceptionId(active.id);
                setReceptionStatus(active.status);
                setRFState("idle");
                setSessionError(null);
                void refreshExpectedLines(active.id);
                setConfirmMessage(
                    `Ya existe una recepción activa (#${active.id}). Se retomó automáticamente.`
                );
                return;
            }

            const now = Date.now();
            const reuseRecentAttempt =
                openReceptionAttemptRef.current &&
                openReceptionAttemptRef.current.warehouseId === wid &&
                now - openReceptionAttemptRef.current.createdAt < 30_000;

            const clientRequestId = reuseRecentAttempt
                ? openReceptionAttemptRef.current.clientRequestId
                : crypto.randomUUID();

            openReceptionAttemptRef.current = {
                warehouseId: wid,
                clientRequestId,
                createdAt: now,
            };

            const res = await openRFReception({
                warehouseId: wid,
                clientRequestId,
                expectedDocumentRef: documentRef?.trim() || undefined,
            });
            setReceptionId(res.id);
            setReceptionStatus(res.status);
            setRFState("idle");
            setReceptionLineId(null);
            setProductName("");
            setExternalProductRef(null);
            setProductSku(null);
            setExpectedQuantity(null);
            setLastCode("");
            setConfirmMessage(null);
            void refreshExpectedLines(res.id);
            openReceptionAttemptRef.current = null;
        } catch (e) {
            if (isApiError(e) && e.status === 409) {
                const details = (e.details ?? null) as ActiveReceptionConflictDetails | null;
                if (
                    e.code === "ACTIVE_RECEPTION_EXISTS" &&
                    details?.existingReceptionId &&
                    Number.isFinite(details.existingReceptionId)
                ) {
                    setReceptionId(details.existingReceptionId);
                    setReceptionStatus(details.status ?? "OPEN");
                    setRFState("idle");
                    setSessionError(null);
                    void refreshExpectedLines(details.existingReceptionId);
                    setConfirmMessage(
                        `Ya existe una recepción activa (#${details.existingReceptionId}). Se retomó automáticamente.`
                    );
                    return;
                }
                try {
                    const activeAfterConflict = await listActiveInventoryReceptions(wid);
                    const resumed = activeAfterConflict[0];
                    if (resumed) {
                        openReceptionAttemptRef.current = null;
                        setReceptionId(resumed.id);
                        setReceptionStatus(resumed.status);
                        setRFState("idle");
                        setSessionError(null);
                        void refreshExpectedLines(resumed.id);
                        setConfirmMessage(
                            `Ya existe una recepción activa (#${resumed.id}). Se retomó automáticamente.`
                        );
                        return;
                    }
                } catch {
                    // si no se puede consultar activas, mostramos el mensaje normal
                }
            }
            if (isApiError(e) && e.code === "ACTIVE_RECEPTION_EXISTS") {
                setSessionError(
                    "Ya existe una recepción activa para esta bodega. Retómala desde el listado de activas."
                );
                return;
            }
            setSessionError(normalizeRFError(e).message);
        } finally {
            setSessionBusy(false);
        }
    }

    const runScan = useCallback(
        async (barcode: string, source: "camera" | "manual") => {
            const scanStartedAt = Date.now();
            const trimmed = barcode.trim();
            if (!trimmed) return;
            if (receptionId == null) {
                setScanError("Abre una recepción antes de escanear.");
                return;
            }
            setLastCode(trimmed);
            setScanError(null);
            const scanResult: RFScanResult = {
                code: trimmed,
                source,
                scannedAt: Date.now(),
            };
            setRFDetected(scanResult);
            try {
                const scanVm = await rfScan({ receptionId, barcode: trimmed });
                setReceptionLineId(scanVm.receptionLineId);
                setProductName(scanVm.productName);
                setExternalProductRef(scanVm.externalProductRef);
                setProductSku(scanVm.productSku);
                setExpectedQuantity(scanVm.expectedQuantity);
                setRequiresLot(scanVm.requiresLot);
                const matchedLine = expectedLines.find(
                    (line) => line.receptionLineId === scanVm.receptionLineId
                );
                const remainingQty = matchedLine
                    ? Math.max(0, matchedLine.expectedQuantity - matchedLine.receivedQuantity)
                    : scanVm.remainingQuantity;
                setQuantity(Math.max(1, remainingQty));
                if (scanVm.suggestedStorageSpaceId != null) {
                    setStorageSpaceId(String(scanVm.suggestedStorageSpaceId));
                }
                setSuggestedStorageSpaceCode(scanVm.suggestedStorageSpaceCode);
                if (source === "manual") {
                    trackRFEvent("scan_success", { source: "manual", codeLength: trimmed.length });
                    trackRFEvent("scan_time", {
                        source: "manual",
                        ms: Date.now() - scanStartedAt,
                    });
                }
                if (!scanVm.requiresLot) {
                    setLotCode("");
                }
            } catch (e) {
                const normalized = normalizeRFError(e);
                setScanError(normalized.message);
                setRFError(normalized.message);
                setReceptionLineId(null);
                setProductName("");
                setExternalProductRef(null);
                setProductSku(null);
                setExpectedQuantity(null);
                setSuggestedStorageSpaceCode(null);
            }
        },
        [expectedLines, receptionId]
    );

    function onManualSubmit() {
        if (!manualCode.trim()) {
            setScanError("Ingresa un código para escanear manualmente.");
            return;
        }
        const trimmedCode = manualCode.trim();
        trackRFEvent("manual_entry", { codeLength: trimmedCode.length });
        setRFState("detected");
        void runScan(trimmedCode, "manual");
        setManualCode("");
    }

    function adjustQty(delta: number) {
        setQuantity((q) => Math.max(1, q + delta));
    }

    async function onConfirm() {
        if (receptionId == null) {
            setConfirmError("Debes abrir una recepción activa antes de confirmar.");
            return;
        }
        if (receptionLineId == null) {
            setConfirmError("Primero escanea un producto válido.");
            return;
        }
        if (requiresLot && !lotCode.trim()) {
            setConfirmError("Este producto requiere código de lote.");
            return;
        }
        if (!Number.isFinite(quantity) || quantity < 1) {
            setConfirmError("Ingresa una cantidad válida mayor o igual a 1.");
            return;
        }
        const sid = storageSpaceId.trim();
        let storageSpaceIdOut: number | undefined;
        if (sid) {
            const parsed = Number.parseInt(sid, 10);
            if (!Number.isFinite(parsed)) {
                setConfirmError("ID de espacio de almacenamiento inválido.");
                return;
            }
            storageSpaceIdOut = parsed;
        }
        setConfirmBusy(true);
        setRFState("confirming");
        confirmStartedAtRef.current = Date.now();
        setConfirmError(null);
        setConfirmMessage(null);
        const payload = {
            receptionLineId,
            receivedQuantity: quantity,
            lotCode: lotCode.trim() || undefined,
            storageSpaceId: storageSpaceIdOut,
        };
        try {
            const confirmVm = await rfConfirm(payload);
            setConfirmMessage(formatRFConfirmSummary(confirmVm));
            setExpectedLines((previous) =>
                previous.map((line) =>
                    line.receptionLineId === receptionLineId
                        ? {
                              ...line,
                              receivedQuantity: line.receivedQuantity + quantity,
                          }
                        : line
                )
            );
            setReceptionLineId(null);
            setProductName("");
            setExternalProductRef(null);
            setProductSku(null);
            setExpectedQuantity(null);
            setLastCode("");
            setSuggestedStorageSpaceCode(null);
            setRFState("success");
            if (confirmStartedAtRef.current) {
                trackRFEvent("confirm_time", {
                    mode: "online",
                    ms: Date.now() - confirmStartedAtRef.current,
                });
            }
            if (
                appEnv.rfHapticsEnabled &&
                typeof navigator !== "undefined" &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(70);
            }
        } catch (e) {
            if (!isOnline || isRFTransientError(e)) {
                try {
                    await enqueueRFConfirmation(payload);
                    const queued = await listRFQueuedConfirmations();
                    setPendingSyncCount(queued.length);
                    setSyncStatus("pending");
                    setSyncMessage(
                        !isOnline
                            ? "Sin conexión: confirmación guardada en cola."
                            : "Error de red: confirmación guardada para reintento automático."
                    );
                    setConfirmMessage("Confirmación en cola. Se enviará al recuperar conexión.");
                    setConfirmError(null);
                    setExpectedLines((previous) =>
                        previous.map((line) =>
                            line.receptionLineId === receptionLineId
                                ? {
                                      ...line,
                                      receivedQuantity: line.receivedQuantity + quantity,
                                  }
                                : line
                        )
                    );
                    setReceptionLineId(null);
                    setProductName("");
                    setExternalProductRef(null);
                    setProductSku(null);
                    setExpectedQuantity(null);
                    setLastCode("");
                    setSuggestedStorageSpaceCode(null);
                    setRFState("success");
                    if (confirmStartedAtRef.current) {
                        trackRFEvent("confirm_time", {
                            mode: "queued_offline",
                            ms: Date.now() - confirmStartedAtRef.current,
                        });
                    }
                } catch {
                    setConfirmError("No se pudo confirmar ni guardar en cola offline.");
                    setRFError("No se pudo confirmar ni guardar en cola offline.");
                }
            } else {
                const normalized = normalizeRFError(e);
                setConfirmError(normalized.message);
                setRFError(normalized.message);
            }
        } finally {
            setConfirmBusy(false);
            confirmStartedAtRef.current = null;
        }
    }

    const {
        isScanning,
        start: startScanFromHook,
        stop: stopScan,
        devices,
        deviceId,
        setDeviceId,
    } = useBarcodeScanner({
        videoRef,
        onCodeDetected: async (code) => {
            setRFState("detected");
            await runScan(code, "camera");
        },
        onError: (message) => {
            setCameraError(message || null);
            if (message) setRFError(message);
        },
        onHint: setDetectorHint,
    });

    async function startScan() {
        if (receptionId == null) {
            setCameraError("Abre una recepción antes de usar la cámara.");
            return;
        }
        setCameraError(null);
        await startScanFromHook();
        if (videoRef.current?.srcObject) {
            setRFState("scanning");
        } else {
            setRFState("idle");
        }
    }

    async function onCompleteReception() {
        if (receptionId == null) return;
        const sid = completeStorageId.trim();
        let completeSid: number | undefined;
        if (sid) {
            const parsed = Number.parseInt(sid, 10);
            if (!Number.isFinite(parsed)) {
                setCompleteError("ID de espacio inválido.");
                return;
            }
            completeSid = parsed;
        }
        setCompleteBusy(true);
        setCompleteError(null);
        try {
            await completeRFReception(receptionId, {
                storageSpaceId: completeSid,
            });
            setReceptionId(null);
            setReceptionStatus(null);
            setConfirmMessage("Recepción cerrada correctamente.");
        } catch (e) {
            setCompleteError(normalizeRFError(e).message);
        } finally {
            setCompleteBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg space-y-6 pb-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                        RF — Entrada de mercancía (dispositivo)
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                        Abre una recepción en bodega, escanea códigos y confirma cantidades registradas en inventario.
                    </p>
                    <p className="mt-2">
                        <Link
                            href="/dashboard/operador/recepcion-mercancia"
                            className="text-sm font-medium text-brand-strong hover:underline"
                        >
                            ← Volver al formulario completo de recepción
                        </Link>
                    </p>
                    {documentRef ? (
                        <p className="mt-2 text-xs text-text-tertiary">
                            Documento: <span className="font-semibold text-text-secondary">{documentRef}</span>
                            {supplier ? (
                                <>
                                    {" "}· Proveedor:{" "}
                                    <span className="font-semibold text-text-secondary">{supplier}</span>
                                </>
                            ) : null}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-border-subtle bg-surface-base px-3 py-2 shadow-sm">
                    <DevicePhoneIcon className="h-5 w-5 text-brand-strong" aria-hidden />
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-text-primary">Dispositivo RF</span>
                        <span className={`text-[10px] font-medium ${isOnline ? "text-success-text" : "text-warning-text"}`}>
                            {isOnline ? "En línea" : "Sin conexión"}
                        </span>
                    </div>
                </div>
            </div>

            {loadWarehousesError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {loadWarehousesError}
                </Alert>
            ) : null}
            {!isOnline ? (
                <Alert variant="warning" className="rounded-xl text-sm">
                    Sin conexión. Puedes seguir escaneando; las confirmaciones se guardarán en cola.
                </Alert>
            ) : null}
            {syncStatus !== "synced" || pendingSyncCount > 0 || syncMessage ? (
                <Alert
                    variant={syncStatus === "error" ? "danger" : "info"}
                    className="rounded-xl text-sm"
                >
                    {syncMessage ?? "Estado de sincronización actualizado."}
                    {pendingSyncCount > 0 ? ` Pendientes: ${pendingSyncCount}.` : ""}
                    {syncStatus === "syncing" ? " Reintentando..." : ""}
                </Alert>
            ) : null}

            <Card>
                <CardHeader title="Sesión de recepción" />
                <CardBody className="space-y-4">
                    <Select
                        label="Bodega *"
                        options={warehouseOptions}
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        disabled={warehouses.length === 0 || receptionId != null}
                    />
                    {receptionId == null ? (
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full"
                            onClick={() => void onOpenReception()}
                            disabled={sessionBusy || !warehouseId}
                            isLoading={sessionBusy}
                        >
                            Abrir recepción
                            {appEnv.isDevelopment ? " (POST /receptions)" : ""}
                        </Button>
                    ) : (
                        <div className="rounded-lg border border-border-subtle bg-surface-sunken/50 px-3 py-2 text-sm">
                            <p>
                                <span className="font-semibold text-text-primary">Recepción #{receptionId}</span>
                                {receptionStatus ? (
                                    <span className="text-text-tertiary"> · {receptionStatus}</span>
                                ) : null}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                    setReceptionId(null);
                                    setReceptionStatus(null);
                                    setExpectedLines([]);
                                    setExpectedLinesError(null);
                                    setReceptionLineId(null);
                                    setProductName("");
                                    setExternalProductRef(null);
                                    setProductSku(null);
                                    setConfirmMessage(null);
                                    setSuggestedStorageSpaceCode(null);
                                }}
                            >
                                Nueva sesión
                            </Button>
                        </div>
                    )}
                    {sessionError ? (
                        <p className="text-xs text-danger-text" role="alert">
                            {sessionError}
                        </p>
                    ) : null}
                </CardBody>
            </Card>

            {receptionId != null ? (
                <Card>
                    <CardHeader title="Pendientes del pedido" />
                    <CardBody className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                            <div className="rounded-md border border-border-subtle bg-surface-sunken px-2 py-1.5">
                                Pendientes: <span className="font-semibold">{expectedSummary.pending}</span>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-sunken px-2 py-1.5">
                                Parciales: <span className="font-semibold">{expectedSummary.partial}</span>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-sunken px-2 py-1.5">
                                Completas: <span className="font-semibold">{expectedSummary.complete}</span>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-sunken px-2 py-1.5">
                                Excesos: <span className="font-semibold">{expectedSummary.excess}</span>
                            </div>
                        </div>
                        {expectedLinesError ? (
                            <Alert variant="warning" className="rounded-lg text-xs">
                                {expectedLinesError}
                            </Alert>
                        ) : null}
                        {expectedLinesBusy ? (
                            <p className="text-xs text-text-tertiary">Cargando líneas esperadas...</p>
                        ) : null}
                        {!expectedLinesBusy && expectedLines.length === 0 ? (
                            <p className="text-xs text-text-tertiary">
                                No hay líneas esperadas asociadas a esta recepción.
                            </p>
                        ) : null}
                        {expectedLines.length > 0 ? (
                            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border-subtle p-2">
                                {expectedLines.map((line) => {
                                    const status =
                                        line.receivedQuantity <= 0
                                            ? "pendiente"
                                            : line.receivedQuantity < line.expectedQuantity
                                              ? "parcial"
                                              : line.receivedQuantity === line.expectedQuantity
                                                ? "completa"
                                                : "exceso";
                                    return (
                                        <div
                                            key={line.receptionLineId}
                                            className="rounded-md border border-border-subtle bg-surface-base px-2 py-2 text-xs"
                                        >
                                            <p className="font-semibold text-text-primary">
                                                {line.productName || "Producto externo"}
                                            </p>
                                            <p className="text-text-tertiary">
                                                SKU: {line.productSku || "N/A"} · Línea #{line.receptionLineId}
                                            </p>
                                            <p className="mt-1 text-text-secondary">
                                                Esperado: {line.expectedQuantity} · Recibido: {line.receivedQuantity}
                                            </p>
                                            <p className="mt-1 font-medium uppercase tracking-wide text-[10px] text-brand-strong">
                                                {status}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </CardBody>
                </Card>
            ) : null}

            <Card>
                <CardHeader title="Escaneo y confirmación" />
                <CardBody className="space-y-5">
                    <div>
                        <span className="text-sm font-medium text-text-secondary">Escanear producto</span>
                        {devices.length > 1 ? (
                            <div className="mt-2">
                                <Select
                                    label="Cámara"
                                    options={devices.map((d) => ({ value: d.deviceId, label: d.label }))}
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    disabled={isScanning}
                                />
                            </div>
                        ) : null}
                        <div className="mt-2 overflow-hidden rounded-xl border-2 border-dashed border-border-default bg-surface-sunken">
                            <div className="relative flex min-h-[200px] flex-col items-center justify-center p-4">
                                <video
                                    ref={videoRef}
                                    className={
                                        isScanning
                                            ? "h-56 w-full rounded-lg bg-black object-cover"
                                            : "hidden"
                                    }
                                    playsInline
                                    muted
                                    aria-label="Vista de cámara para escaneo"
                                />
                                {isScanning ? <RFScannerOverlay /> : null}
                                {!isScanning ? (
                                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                                        <BarcodeIllustration className="h-16 w-28 text-text-tertiary" />
                                        <p className="text-sm font-medium text-text-secondary">
                                            Escanee el código de barras
                                        </p>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            onClick={() => void startScan()}
                                            disabled={receptionId == null}
                                        >
                                            Activar cámara
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex w-full justify-center p-2">
                                        <Button type="button" variant="outline" size="sm" onClick={stopScan}>
                                            Detener cámara
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {cameraError ? (
                            <p className="mt-2 text-xs text-danger-text" role="alert">
                                {cameraError}
                            </p>
                        ) : null}
                        {detectorHint ? <p className="mt-2 text-xs text-text-tertiary">{detectorHint}</p> : null}
                        {scanError ? (
                            <p className="mt-2 text-xs text-danger-text" role="alert">
                                {scanError}
                            </p>
                        ) : null}
                        {lastCode ? (
                            <p className="mt-2 text-xs text-text-secondary">
                                Último código: <span className="font-mono font-semibold">{lastCode}</span>
                            </p>
                        ) : null}
                    </div>

                    <ManualBarcodeInput
                        id={`${formId}-manual`}
                        value={manualCode}
                        onChange={setManualCode}
                        onSubmit={onManualSubmit}
                        disabled={receptionId == null}
                    />

                    {productName || externalProductRef ? (
                        <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-base p-3">
                            <p className="text-sm font-semibold text-text-primary">
                                {productName || "Producto externo"}
                            </p>
                            {externalProductRef ? (
                                <p className="text-xs text-text-tertiary">
                                    Ref. externa:{" "}
                                    <span className="font-mono text-text-secondary">{externalProductRef}</span>
                                </p>
                            ) : null}
                            {productSku ? (
                                <p className="text-xs text-text-tertiary">
                                    SKU: <span className="font-mono text-text-secondary">{productSku}</span>
                                </p>
                            ) : null}
                            {expectedQuantity != null ? (
                                <p className="text-xs text-text-secondary">
                                    Cantidad esperada (referencia): {expectedQuantity}
                                </p>
                            ) : null}
                            {suggestedStorageSpaceCode ? (
                                <p className="rounded-md border border-info-default/30 bg-info-subtle px-2 py-1 text-xs text-info-strong">
                                    Ubicación sugerida: {suggestedStorageSpaceCode}
                                </p>
                            ) : null}
                            {requiresLot ? (
                                <Input
                                    label="Código de lote *"
                                    value={lotCode}
                                    onChange={(e) => setLotCode(e.target.value)}
                                    placeholder="LOTE-001"
                                />
                            ) : (
                                <Input
                                    label="Código de lote (opcional)"
                                    value={lotCode}
                                    onChange={(e) => setLotCode(e.target.value)}
                                />
                            )}
                            <StorageSpaceLocationPicker
                                value={storageSpaceId}
                                onChange={setStorageSpaceId}
                                label="Ubicación de la línea (opcional)"
                            />
                            <div>
                                <span className="text-sm font-medium text-text-secondary">Cantidad recibida *</span>
                                <div className="mt-1.5 flex h-10 items-stretch rounded-lg border border-border-default bg-surface-base">
                                    <button
                                        type="button"
                                        className="flex w-11 items-center justify-center border-r border-border-subtle text-lg font-medium text-text-primary hover:bg-surface-hover"
                                        onClick={() => adjustQty(-1)}
                                        aria-label="Disminuir cantidad"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full border-0 bg-transparent text-center text-sm font-semibold text-text-primary outline-none focus:ring-0"
                                        value={quantity}
                                        onChange={(e) => {
                                            const n = Number.parseInt(e.target.value, 10);
                                            setQuantity(Number.isFinite(n) && n >= 1 ? n : 1);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="flex w-11 items-center justify-center border-l border-border-subtle text-lg font-medium text-text-primary hover:bg-surface-hover"
                                        onClick={() => adjustQty(1)}
                                        aria-label="Aumentar cantidad"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="primary"
                                className="w-full"
                                onClick={() => void onConfirm()}
                                disabled={confirmBusy}
                                isLoading={confirmBusy}
                            >
                                Confirmar recepción (RF)
                            </Button>
                            {confirmError ? (
                                <p className="text-xs text-danger-text">{confirmError}</p>
                            ) : null}
                            {confirmMessage ? (
                                <p className="text-xs font-medium text-success-text">{confirmMessage}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {receptionId != null ? (
                        <div className="border-t border-border-subtle pt-4 space-y-2">
                            <p className="text-xs font-semibold text-text-secondary">Cerrar recepción</p>
                            <StorageSpaceLocationPicker
                                value={completeStorageId}
                                onChange={setCompleteStorageId}
                                label="Ubicación al cerrar recepción (opcional)"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => void onCompleteReception()}
                                disabled={completeBusy}
                                isLoading={completeBusy}
                            >
                                Finalizar recepción
                            </Button>
                            {completeError ? (
                                <p className="text-xs text-danger-text">{completeError}</p>
                            ) : null}
                        </div>
                    ) : null}
                </CardBody>
            </Card>
        </div>
    );
}

function DevicePhoneIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
    );
}

function BarcodeIllustration({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 120 48" className={className} aria-hidden fill="currentColor">
            <rect x="4" y="4" width="3" height="40" rx="0.5" />
            <rect x="12" y="4" width="2" height="40" />
            <rect x="18" y="4" width="5" height="40" />
            <rect x="28" y="4" width="2" height="40" />
            <rect x="34" y="4" width="3" height="40" />
            <rect x="42" y="4" width="6" height="40" />
            <rect x="52" y="4" width="2" height="40" />
            <rect x="58" y="4" width="4" height="40" />
            <rect x="68" y="4" width="2" height="40" />
            <rect x="74" y="4" width="8" height="40" />
            <rect x="86" y="4" width="3" height="40" />
            <rect x="94" y="4" width="2" height="40" />
            <rect x="100" y="4" width="5" height="40" />
            <rect x="110" y="4" width="3" height="40" />
        </svg>
    );
}
