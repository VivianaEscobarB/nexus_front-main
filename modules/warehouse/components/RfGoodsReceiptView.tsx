"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { appEnv } from "@/lib/config/env";
import { listWarehouses, type ManagedWarehouse } from "@/modules/infrastructure";
import {
    completeRfReception,
    createInventoryReception,
    rfConfirm,
    rfScan,
} from "@/modules/warehouse/api/operatorInventoryApi";
import { StorageSpaceLocationPicker } from "@/modules/warehouse/components/StorageSpaceLocationPicker";
import { isApiError } from "@/shared/api/apiError";

declare global {
    interface Window {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
            detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
        };
    }
}

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "Error al comunicarse con el servidor.";
}

export function RfGoodsReceiptView() {
    const formId = useId();
    const videoRef = useRef<HTMLVideoElement>(null);
    const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const [expectedQuantity, setExpectedQuantity] = useState<number | null>(null);
    const [requiresLot, setRequiresLot] = useState(false);
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

    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [detectorHint, setDetectorHint] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await listWarehouses();
                if (!cancelled) {
                    setWarehouses(list);
                    setWarehouseId((prev) => (prev || (list[0]?.id ?? "")));
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadWarehousesError(getErrorMessage(e));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const warehouseOptions = warehouses.map((w) => ({
        value: w.id,
        label: `${w.name} (${w.code})`,
    }));

    async function onOpenReception() {
        setSessionError(null);
        const wid = Number.parseInt(warehouseId, 10);
        if (!Number.isFinite(wid)) {
            setSessionError("Selecciona una bodega válida.");
            return;
        }
        setSessionBusy(true);
        try {
            const res = await createInventoryReception({ warehouseId: wid });
            setReceptionId(res.id);
            setReceptionStatus(res.status);
            setReceptionLineId(null);
            setProductName("");
            setExpectedQuantity(null);
            setLastCode("");
            setConfirmMessage(null);
        } catch (e) {
            setSessionError(getErrorMessage(e));
        } finally {
            setSessionBusy(false);
        }
    }

    const stopScan = useCallback(() => {
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
            detectIntervalRef.current = null;
        }
        const v = videoRef.current;
        if (v?.srcObject) {
            (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            v.srcObject = null;
        }
        setScanning(false);
    }, []);

    useEffect(() => () => stopScan(), [stopScan]);

    const runScan = useCallback(
        async (barcode: string) => {
            const trimmed = barcode.trim();
            if (!trimmed) return;
            if (receptionId == null) {
                setScanError("Abre una recepción antes de escanear.");
                return;
            }
            setLastCode(trimmed);
            setScanError(null);
            try {
                const res = await rfScan({ receptionId, barcode: trimmed });
                setReceptionLineId(res.receptionLineId);
                setProductName(res.productName);
                setExpectedQuantity(res.expectedQuantity);
                setRequiresLot(res.requiresLot);
                setQuantity(Math.max(1, res.expectedQuantity));
                if (!res.requiresLot) {
                    setLotCode("");
                }
            } catch (e) {
                setScanError(getErrorMessage(e));
                setReceptionLineId(null);
                setProductName("");
                setExpectedQuantity(null);
            }
        },
        [receptionId]
    );

    async function startScan() {
        setCameraError(null);
        setDetectorHint(null);

        if (receptionId == null) {
            setCameraError("Abre una recepción antes de usar la cámara.");
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("Este dispositivo no permite acceso a la cámara desde el navegador.");
            return;
        }

        if (typeof window.BarcodeDetector !== "function") {
            setDetectorHint(
                "Lectura automática no disponible en este navegador. Ingresa el código manualmente abajo.",
            );
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            const v = videoRef.current;
            if (!v) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }
            v.srcObject = stream;
            await v.play();
            setScanning(true);

            if (typeof window.BarcodeDetector === "function") {
                const detector = new window.BarcodeDetector({
                    formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
                });
                detectIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes.length > 0 && codes[0].rawValue) {
                            await runScan(codes[0].rawValue);
                            stopScan();
                        }
                    } catch {
                        /* frame no listo */
                    }
                }, 280);
            }
        } catch {
            setCameraError(
                "No se pudo usar la cámara. Revisa permisos o usa la entrada manual del código.",
            );
        }
    }

    function onManualSubmit(e: React.FormEvent) {
        e.preventDefault();
        void runScan(manualCode);
        setManualCode("");
    }

    function adjustQty(delta: number) {
        setQuantity((q) => Math.max(1, q + delta));
    }

    async function onConfirm() {
        if (receptionLineId == null) {
            setConfirmError("Primero escanea un código válido.");
            return;
        }
        if (requiresLot && !lotCode.trim()) {
            setConfirmError("Este producto requiere código de lote.");
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
        setConfirmError(null);
        setConfirmMessage(null);
        try {
            const res = await rfConfirm({
                receptionLineId,
                receivedQuantity: quantity,
                lotCode: lotCode.trim() || undefined,
                storageSpaceId: storageSpaceIdOut,
            });
            setConfirmMessage(
                `Registrado. Estado: ${res.status}. Diferencia: ${res.difference}.` +
                    (res.alertCreated ? " Se generó una alerta." : "")
            );
            setReceptionLineId(null);
            setProductName("");
            setExpectedQuantity(null);
            setLastCode("");
        } catch (e) {
            setConfirmError(getErrorMessage(e));
        } finally {
            setConfirmBusy(false);
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
            await completeRfReception(receptionId, {
                storageSpaceId: completeSid,
            });
            setReceptionId(null);
            setReceptionStatus(null);
            setConfirmMessage("Recepción cerrada correctamente.");
        } catch (e) {
            setCompleteError(getErrorMessage(e));
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
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-border-subtle bg-surface-base px-3 py-2 shadow-sm">
                    <DevicePhoneIcon className="h-5 w-5 text-brand-strong" aria-hidden />
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-text-primary">Dispositivo RF</span>
                        <span className="text-[10px] font-medium text-success-text">En línea</span>
                    </div>
                </div>
            </div>

            {loadWarehousesError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {loadWarehousesError}
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
                                    setReceptionLineId(null);
                                    setProductName("");
                                    setConfirmMessage(null);
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

            <Card>
                <CardHeader title="Escaneo y confirmación" />
                <CardBody className="space-y-5">
                    <div>
                        <span className="text-sm font-medium text-text-secondary">Escanear producto</span>
                        <div className="mt-2 overflow-hidden rounded-xl border-2 border-dashed border-border-default bg-surface-sunken">
                            <div className="relative flex min-h-[200px] flex-col items-center justify-center p-4">
                                <video
                                    ref={videoRef}
                                    className={
                                        scanning
                                            ? "h-56 w-full rounded-lg bg-black object-cover"
                                            : "hidden"
                                    }
                                    playsInline
                                    muted
                                    aria-label="Vista de cámara para escaneo"
                                />
                                {!scanning ? (
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

                    <form onSubmit={onManualSubmit} className="space-y-2 rounded-lg border border-border-subtle bg-surface-base p-3">
                        <Label htmlFor={`${formId}-manual`}>Código manual</Label>
                        <div className="flex gap-2">
                            <Input
                                id={`${formId}-manual`}
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="EAN / Code 128"
                                className="flex-1"
                                disabled={receptionId == null}
                            />
                            <Button type="submit" variant="secondary" disabled={receptionId == null}>
                                Escanear
                            </Button>
                        </div>
                    </form>

                    {productName ? (
                        <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-base p-3">
                            <p className="text-sm font-semibold text-text-primary">{productName}</p>
                            {expectedQuantity != null ? (
                                <p className="text-xs text-text-secondary">
                                    Cantidad esperada (referencia): {expectedQuantity}
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
