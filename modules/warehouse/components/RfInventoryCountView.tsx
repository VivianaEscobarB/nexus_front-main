"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { appEnv } from "@/lib/config/env";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
    addInventoryCountLine,
    completeInventoryCount,
    createInventoryCount,
    listInventoryBalances,
    listInventoryProducts,
    listProductLots,
} from "@/modules/warehouse/api/operatorInventoryApi";
import type { InventoryProductResponse, LotResponse } from "@/modules/warehouse/api/operatorInventoryTypes";
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
    return "Error en la operación.";
}

export function RfInventoryCountView() {
    const formId = useId();
    const videoRef = useRef<HTMLVideoElement>(null);
    const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const detectInFlightRef = useRef(false);

    const [products, setProducts] = useState<InventoryProductResponse[]>([]);
    const [productId, setProductId] = useState("");
    const [lots, setLots] = useState<LotResponse[]>([]);
    const [lotId, setLotId] = useState("");

    const [sectorIdInput, setSectorIdInput] = useState("");
    const [countId, setCountId] = useState<number | null>(null);
    const [countBusy, setCountBusy] = useState(false);
    const [countError, setCountError] = useState<string | null>(null);

    const [storageSpaceId, setStorageSpaceId] = useState("");
    const [systemQty, setSystemQty] = useState(0);
    const [physicalQty, setPhysicalQty] = useState(0);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const [lineBusy, setLineBusy] = useState(false);
    const [lineMessage, setLineMessage] = useState<string | null>(null);
    const [lineError, setLineError] = useState<string | null>(null);

    const [completeBusy, setCompleteBusy] = useState(false);

    const [manualCode, setManualCode] = useState("");
    const [lastCode, setLastCode] = useState("");

    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [detectorHint, setDetectorHint] = useState<string | null>(null);

    const productOptions = useMemo(
        () =>
            products.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${p.barcode})`,
            })),
        [products]
    );

    const lotOptions = useMemo(() => {
        const opts = lots.map((l) => ({
            value: String(l.id),
            label: l.lotNumber,
        }));
        return [{ value: "", label: "Sin lote" }, ...opts];
    }, [lots]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await listInventoryProducts();
                if (!cancelled) {
                    setProducts(list.filter((p) => p.active !== false));
                    if (list.length > 0) {
                        setProductId(String(list[0].id));
                    }
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const pid = Number.parseInt(productId, 10);
        if (!Number.isFinite(pid)) {
            setLots([]);
            setLotId("");
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const list = await listProductLots(pid);
                if (!cancelled) {
                    setLots(list);
                    setLotId(list[0] ? String(list[0].id) : "");
                }
            } catch {
                if (!cancelled) {
                    setLots([]);
                    setLotId("");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [productId]);

    const refreshSystemQty = useCallback(async () => {
        const pid = Number.parseInt(productId, 10);
        const sid = Number.parseInt(storageSpaceId.trim(), 10);
        if (!Number.isFinite(pid) || !Number.isFinite(sid)) {
            setSystemQty(0);
            return;
        }
        setBalanceLoading(true);
        try {
            const lid = lotId ? Number.parseInt(lotId, 10) : undefined;
            const rows = await listInventoryBalances({
                productId: pid,
                storageSpaceId: sid,
            });
            const filtered =
                lid != null && Number.isFinite(lid)
                    ? rows.filter((r) => r.lotId === lid)
                    : rows;
            const useRows = filtered.length ? filtered : rows;
            const sum = useRows.reduce((acc, r) => acc + r.quantity, 0);
            setSystemQty(sum);
        } catch {
            setSystemQty(0);
        } finally {
            setBalanceLoading(false);
        }
    }, [productId, storageSpaceId, lotId]);

    useEffect(() => {
        const t = window.setTimeout(() => void refreshSystemQty(), 350);
        return () => window.clearTimeout(t);
    }, [refreshSystemQty]);

    const difference = physicalQty - systemQty;

    function resolveProductByBarcode(code: string) {
        const c = code.trim();
        if (!c) return;
        const found = products.find((p) => p.barcode === c);
        if (found) {
            setProductId(String(found.id));
        }
        setLastCode(c);
    }

    const stopScan = useCallback(() => {
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
            detectIntervalRef.current = null;
        }
        detectInFlightRef.current = false;
        const v = videoRef.current;
        if (v?.srcObject) {
            (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            v.srcObject = null;
        }
        setScanning(false);
    }, []);

    useEffect(() => () => stopScan(), [stopScan]);

    async function startScan() {
        setCameraError(null);
        setDetectorHint(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("Cámara no disponible en este navegador.");
            return;
        }
        if (typeof window.BarcodeDetector !== "function") {
            setDetectorHint("Usa el código manual si el navegador no soporta detección.");
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
                    if (
                        detectInFlightRef.current ||
                        !videoRef.current ||
                        videoRef.current.readyState < 2
                    ) {
                        return;
                    }
                    detectInFlightRef.current = true;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes.length > 0 && codes[0].rawValue) {
                            resolveProductByBarcode(codes[0].rawValue);
                            stopScan();
                        }
                    } catch {
                        /* frame */
                    } finally {
                        detectInFlightRef.current = false;
                    }
                }, 280);
            }
        } catch {
            setCameraError("No se pudo activar la cámara.");
        }
    }

    function onManualCodeSubmit(e: React.FormEvent) {
        e.preventDefault();
        resolveProductByBarcode(manualCode);
        setManualCode("");
    }

    function adjustPhysical(delta: number) {
        setPhysicalQty((q) => Math.max(0, q + delta));
    }

    async function onStartCount() {
        setCountError(null);
        setCountBusy(true);
        try {
            const s = sectorIdInput.trim();
            const sectorId = s ? Number.parseInt(s, 10) : undefined;
            if (s && !Number.isFinite(sectorId)) {
                setCountError("sectorId inválido.");
                setCountBusy(false);
                return;
            }
            const res = await createInventoryCount(
                sectorId != null && Number.isFinite(sectorId) ? { sectorId } : {}
            );
            setCountId(res.id);
            setLineMessage(`Conteo #${res.id} iniciado (${res.status}).`);
        } catch (e) {
            setCountError(getErrorMessage(e));
        } finally {
            setCountBusy(false);
        }
    }

    async function onSaveLine() {
        if (countId == null) {
            setLineError("Inicia un conteo antes de guardar líneas.");
            return;
        }
        const pid = Number.parseInt(productId, 10);
        const sid = Number.parseInt(storageSpaceId.trim(), 10);
        if (!Number.isFinite(pid) || !Number.isFinite(sid)) {
            setLineError("Producto e ID de espacio de almacenamiento son obligatorios.");
            return;
        }
        const lid = lotId ? Number.parseInt(lotId, 10) : null;
        const diff = physicalQty - systemQty;
        setLineBusy(true);
        setLineError(null);
        try {
            await addInventoryCountLine(countId, {
                productId: pid,
                lotId: lid != null && Number.isFinite(lid) ? lid : null,
                storageSpaceId: sid,
                systemQty,
                physicalQty,
                difference: diff,
            });
            setLineMessage("Línea de conteo registrada.");
        } catch (e) {
            setLineError(getErrorMessage(e));
        } finally {
            setLineBusy(false);
        }
    }

    async function onCompleteCount() {
        if (countId == null) return;
        setCompleteBusy(true);
        setLineError(null);
        try {
            await completeInventoryCount(countId);
            setLineMessage(`Conteo #${countId} cerrado.`);
            setCountId(null);
        } catch (e) {
            setLineError(getErrorMessage(e));
        } finally {
            setCompleteBusy(false);
        }
    }

    const diffLabel =
        difference === 0 ? null : `${difference > 0 ? "+" : ""}${difference} UN`;

    return (
        <div className="mx-auto max-w-2xl space-y-6 pb-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                        RF — Conteo de inventario (dispositivo)
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                        Inicia un conteo cíclico, registra líneas con cantidad sistema vs física y ciérralo cuando
                        termines el recorrido.
                    </p>
                    <p className="mt-2">
                        <Link
                            href="/dashboard/consulta-inventario"
                            className="text-sm font-medium text-brand-strong hover:underline"
                        >
                            ← Consulta de inventario
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

            <Card>
                <CardHeader title="Sesión de conteo" />
                <CardBody className="space-y-4">
                    <Input
                        label="ID sector (opcional)"
                        value={sectorIdInput}
                        onChange={(e) => setSectorIdInput(e.target.value)}
                        placeholder="Vacío = sin sector"
                        disabled={countId != null}
                    />
                    {countId == null ? (
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full"
                            onClick={() => void onStartCount()}
                            disabled={countBusy}
                            isLoading={countBusy}
                        >
                            Iniciar conteo
                            {appEnv.isDevelopment ? " (POST /counts)" : ""}
                        </Button>
                    ) : (
                        <div className="rounded-lg border border-border-subtle bg-surface-sunken/50 px-3 py-2 text-sm">
                            <p className="font-semibold text-text-primary">Conteo activo #{countId}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => void onCompleteCount()} disabled={completeBusy} isLoading={completeBusy}>
                                    Cerrar conteo
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCountId(null);
                                        setLineMessage(null);
                                    }}
                                >
                                    Desvincular sesión
                                </Button>
                            </div>
                        </div>
                    )}
                    {countError ? <p className="text-xs text-danger-text">{countError}</p> : null}
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Producto y ubicación" />
                <CardBody className="space-y-5">
                    <Select
                        label="Producto *"
                        options={productOptions}
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                    />
                    <Select label="Lote" options={lotOptions} value={lotId} onChange={(e) => setLotId(e.target.value)} />
                    <StorageSpaceLocationPicker
                        value={storageSpaceId}
                        onChange={setStorageSpaceId}
                        label="Ubicación del conteo *"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => void refreshSystemQty()} disabled={balanceLoading}>
                        {balanceLoading ? "Cargando saldo…" : "Actualizar cantidad sistema (balances)"}
                    </Button>

                    <div className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-3">
                        <p className="text-xs font-medium text-text-tertiary">Escanear código de barras</p>
                        <div className="relative mt-2 overflow-hidden rounded-lg border border-dashed border-border-default bg-surface-base">
                            <video
                                ref={videoRef}
                                className={scanning ? "h-40 w-full bg-black object-cover" : "hidden"}
                                playsInline
                                muted
                                aria-label="Cámara"
                            />
                            {!scanning ? (
                                <div className="flex flex-col items-center gap-2 py-4">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => void startScan()}>
                                        Activar cámara
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex justify-center p-2">
                                    <Button type="button" variant="outline" size="sm" onClick={stopScan}>
                                        Detener
                                    </Button>
                                </div>
                            )}
                        </div>
                        {cameraError ? (
                            <p className="mt-2 text-xs text-danger-text" role="alert">
                                {cameraError}
                            </p>
                        ) : null}
                        {detectorHint ? <p className="mt-2 text-xs text-text-tertiary">{detectorHint}</p> : null}
                        {lastCode ? (
                            <p className="mt-2 text-xs text-text-secondary">
                                Código: <span className="font-mono font-semibold">{lastCode}</span>
                            </p>
                        ) : null}
                        <form onSubmit={onManualCodeSubmit} className="mt-3 flex gap-2">
                            <Input
                                id={`${formId}-code`}
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Código manual"
                                wrapperClassName="flex-1"
                            />
                            <Button type="submit" variant="secondary" size="md">
                                Aplicar
                            </Button>
                        </form>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Conteo" description="Sistema vs físico." />
                <CardBody className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-info-default/25 bg-info-subtle px-4 py-5 text-center shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-info-strong">
                                Cantidad en sistema
                            </p>
                            <p className="mt-2 text-3xl font-bold tabular-nums text-info-text">
                                {systemQty} <span className="text-lg font-semibold">UN</span>
                            </p>
                        </div>
                        <div className="rounded-xl border border-success-default/25 bg-success-subtle px-4 py-5 text-center shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-success-strong">
                                Cantidad física
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-surface-base text-lg hover:bg-surface-hover"
                                    onClick={() => adjustPhysical(-1)}
                                    aria-label="Menos una unidad"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-20 border-0 bg-transparent text-center text-3xl font-bold tabular-nums text-success-text outline-none"
                                    value={physicalQty}
                                    onChange={(e) => {
                                        const n = Number.parseInt(e.target.value, 10);
                                        setPhysicalQty(Number.isFinite(n) && n >= 0 ? n : 0);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-surface-base text-lg hover:bg-surface-hover"
                                    onClick={() => adjustPhysical(1)}
                                    aria-label="Más una unidad"
                                >
                                    +
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-text-tertiary">UN</p>
                        </div>
                    </div>

                    {difference !== 0 ? (
                        <div
                            className="flex items-center gap-3 rounded-xl border border-danger-default/35 bg-danger-subtle px-4 py-3"
                            role="status"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-default text-white">
                                <ExclamationIcon className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-danger-strong">Diferencia</p>
                                <p className="text-sm font-bold tabular-nums text-danger-text">{diffLabel}</p>
                            </div>
                        </div>
                    ) : systemQty > 0 && physicalQty === systemQty ? (
                        <div className="flex items-center gap-3 rounded-xl border border-success-default/35 bg-success-subtle px-4 py-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-default text-white">
                                <CheckIcon className="h-5 w-5" />
                            </span>
                            <p className="text-sm font-semibold text-success-strong">Coincide con el saldo consultado.</p>
                        </div>
                    ) : null}

                    {lineError ? (
                        <Alert variant="danger" className="rounded-xl text-sm">
                            {lineError}
                        </Alert>
                    ) : null}
                    {lineMessage ? (
                        <Alert variant="success" className="rounded-xl text-sm">
                            {lineMessage}
                        </Alert>
                    ) : null}

                    <Button
                        type="button"
                        variant="primary"
                        className="w-full"
                        leftIcon={<SaveIcon className="h-5 w-5" />}
                        onClick={() => void onSaveLine()}
                        disabled={lineBusy || countId == null}
                        isLoading={lineBusy}
                    >
                        Guardar línea de conteo
                    </Button>
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

function ExclamationIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
    );
}

function SaveIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
    );
}
