"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";

import { appEnv } from "@/lib/config/env";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
    createInventoryMovement,
    listInventoryBalances,
    listInventoryProducts,
    listMovementSubtypes,
    listMovementTypes,
    listProductLots,
} from "@/modules/warehouse/api/operatorInventoryApi";
import type {
    InventoryBalanceRow,
    InventoryProductResponse,
    LotResponse,
    MovementSubtypeResponse,
    MovementTypeResponse,
} from "@/modules/warehouse/api/operatorInventoryTypes";
import { StorageSpaceLocationPicker } from "@/modules/warehouse/components/StorageSpaceLocationPicker";
import { isApiError } from "@/shared/api/apiError";

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible completar la operación.";
}

function isExitMovementType(name: string): boolean {
    const u = name.toUpperCase();
    return u.includes("SALIDA") || u.includes("SALID") || u === "EXIT";
}

export function InventoryMovementFormView() {
    const formId = useId();

    const [loadError, setLoadError] = useState<string | null>(null);
    const [movementTypes, setMovementTypes] = useState<MovementTypeResponse[]>([]);
    const [movementTypeId, setMovementTypeId] = useState("");
    const [subtypes, setSubtypes] = useState<MovementSubtypeResponse[]>([]);
    const [movementSubtypeId, setMovementSubtypeId] = useState("");

    const [products, setProducts] = useState<InventoryProductResponse[]>([]);
    const [productId, setProductId] = useState("");
    const [lots, setLots] = useState<LotResponse[]>([]);
    const [lotId, setLotId] = useState("");

    const [storageSpaceId, setStorageSpaceId] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [observation, setObservation] = useState("");

    const [balances, setBalances] = useState<InventoryBalanceRow[]>([]);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const selectedType = useMemo(
        () => movementTypes.find((t) => String(t.id) === movementTypeId),
        [movementTypes, movementTypeId]
    );

    const subtypeOptions = useMemo(() => {
        return subtypes.map((s) => ({ value: String(s.id), label: s.name }));
    }, [subtypes]);

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
            label: l.lotNumber + (l.expirationDate ? ` · vence ${l.expirationDate}` : ""),
        }));
        return [{ value: "", label: "Sin lote / no aplica" }, ...opts];
    }, [lots]);

    const movementTypeOptions = useMemo(
        () => movementTypes.map((t) => ({ value: String(t.id), label: t.name })),
        [movementTypes]
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const [types, prods] = await Promise.all([
                    listMovementTypes(),
                    listInventoryProducts(),
                ]);
                if (cancelled) return;
                setMovementTypes(types);
                setProducts(prods.filter((p) => p.active !== false));
                if (types.length > 0) {
                    setMovementTypeId(String(types[0].id));
                }
                if (prods.length > 0) {
                    setProductId(String(prods[0].id));
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadError(getErrorMessage(e));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const id = Number.parseInt(movementTypeId, 10);
        if (!Number.isFinite(id)) {
            setSubtypes([]);
            setMovementSubtypeId("");
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const list = await listMovementSubtypes(id);
                if (cancelled) return;
                setSubtypes(list);
                setMovementSubtypeId(list[0] ? String(list[0].id) : "");
            } catch {
                if (!cancelled) {
                    setSubtypes([]);
                    setMovementSubtypeId("");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [movementTypeId]);

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
                if (cancelled) return;
                setLots(list);
                setLotId(list[0] ? String(list[0].id) : "");
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

    const refreshBalances = useCallback(async () => {
        const pid = Number.parseInt(productId, 10);
        const sid = Number.parseInt(storageSpaceId.trim(), 10);
        if (!Number.isFinite(pid) || !Number.isFinite(sid)) {
            setBalances([]);
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
            setBalances(filtered.length ? filtered : rows);
        } catch {
            setBalances([]);
        } finally {
            setBalanceLoading(false);
        }
    }, [productId, storageSpaceId, lotId]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void refreshBalances();
        }, 400);
        return () => window.clearTimeout(t);
    }, [refreshBalances]);

    const qtyParsed = useMemo(() => {
        const n = Number.parseFloat(quantity.replace(",", "."));
        return Number.isFinite(n) && n >= 0 ? n : 0;
    }, [quantity]);

    const available = useMemo(() => {
        if (balances.length === 0) return 0;
        return balances.reduce((acc, r) => acc + r.quantity, 0);
    }, [balances]);

    const exitType = selectedType ? isExitMovementType(selectedType.name) : false;

    const projection = useMemo(() => {
        if (exitType) {
            return { after: available - qtyParsed, mode: "delta" as const };
        }
        if (selectedType?.name.toUpperCase().includes("ENTRADA")) {
            return { after: available + qtyParsed, mode: "delta" as const };
        }
        return { after: available, mode: "ajuste" as const };
    }, [exitType, selectedType, available, qtyParsed]);

    const stockWarning = exitType && projection.after < 0;

    async function onSubmit() {
        setSubmitError(null);
        setSubmitSuccess(null);
        const mtid = Number.parseInt(movementTypeId, 10);
        const pid = Number.parseInt(productId, 10);
        const sid = Number.parseInt(storageSpaceId.trim(), 10);
        if (!Number.isFinite(mtid) || !Number.isFinite(pid) || !Number.isFinite(sid)) {
            setSubmitError("Completa tipo de movimiento, producto e ID de espacio de almacenamiento.");
            return;
        }
        if (stockWarning) {
            setSubmitError("La cantidad supera el disponible para salida.");
            return;
        }
        let subId: number | null = null;
        if (movementSubtypeId) {
            const s = Number.parseInt(movementSubtypeId, 10);
            if (Number.isFinite(s)) subId = s;
        }
        let lid: number | null | undefined;
        if (lotId) {
            const l = Number.parseInt(lotId, 10);
            lid = Number.isFinite(l) ? l : undefined;
        } else {
            lid = undefined;
        }
        setSubmitBusy(true);
        try {
            const res = await createInventoryMovement({
                productId: pid,
                lotId: lid,
                storageSpaceId: sid,
                movementTypeId: mtid,
                movementSubtypeId: subId,
                quantity: qtyParsed,
                note: observation.trim() || null,
            });
            setSubmitSuccess(
                `Movimiento #${res.id} registrado (${res.movementTypeName}${res.movementSubtypeName ? ` · ${res.movementSubtypeName}` : ""}).`
            );
        } catch (e) {
            setSubmitError(getErrorMessage(e));
        } finally {
            setSubmitBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-28">
            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Nuevo movimiento de inventario
                </h2>
                <p className="text-sm text-text-secondary">
                    Tipos y subtipos según el catálogo del sistema. Elige bodega, sector y espacio o indica el ID en
                    modo avanzado.
                </p>
            </header>

            {loadError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {loadError}
                </Alert>
            ) : null}

            <Card>
                <CardHeader
                    title="Datos del movimiento"
                    description="Selecciona tipo, producto, lote (si aplica) y ubicación."
                />
                <CardBody className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Tipo de movimiento *"
                            options={movementTypeOptions}
                            value={movementTypeId}
                            onChange={(e) => setMovementTypeId(e.target.value)}
                            disabled={movementTypeOptions.length === 0}
                        />
                        <Select
                            label="Subtipo"
                            options={
                                subtypeOptions.length > 0
                                    ? subtypeOptions
                                    : [{ value: "", label: "Sin subtipos" }]
                            }
                            value={movementSubtypeId}
                            onChange={(e) => setMovementSubtypeId(e.target.value)}
                            disabled={subtypeOptions.length === 0}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Producto *"
                            options={productOptions}
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            disabled={productOptions.length === 0}
                        />
                        <Select
                            label="Lote"
                            options={lotOptions}
                            value={lotId}
                            onChange={(e) => setLotId(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <StorageSpaceLocationPicker
                                value={storageSpaceId}
                                onChange={setStorageSpaceId}
                                label="Ubicación en bodega *"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-text-secondary">Cantidad *</span>
                            <div className="flex h-10 max-w-full items-stretch gap-2 rounded-lg border border-border-default bg-surface-base transition-colors focus-within:border-border-focus focus-within:ring-2 focus-within:ring-brand-default/20">
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-text-primary outline-none focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor={`${formId}-obs`} muted>
                            Observación
                        </Label>
                        <textarea
                            id={`${formId}-obs`}
                            rows={3}
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Nota u observación (note)"
                            className="mt-1.5 w-full resize-y rounded-lg border border-border-default bg-surface-base px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                        />
                    </div>
                </CardBody>
            </Card>

            <section
                className="rounded-xl border border-info-default/35 bg-info-subtle px-4 py-4 shadow-sm sm:px-5 sm:py-5"
                aria-live="polite"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-strong"
                            aria-hidden
                        >
                            <InfoCircleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-info-strong">Saldo en ubicación</h3>
                            {appEnv.isDevelopment ? (
                                <p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                                    GET /api/inventory/balances (productId, storageSpaceId)
                                </p>
                            ) : null}
                            <p className="mt-1 text-xs text-text-secondary">
                                {balanceLoading ? "Actualizando…" : "Suma de filas que coinciden con producto y espacio."}
                            </p>
                        </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void refreshBalances()}>
                        Refrescar saldo
                    </Button>
                </div>

                <div className="mt-5 grid gap-4 border-t border-info-default/25 pt-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-base/80 px-4 py-3 ring-1 ring-border-subtle">
                        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                            Disponible (referencia)
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-brand-strong">
                            {available}{" "}
                            <span className="text-sm font-semibold text-text-secondary">UN</span>
                        </p>
                    </div>
                    <div
                        className={[
                            "rounded-lg px-4 py-3 ring-1",
                            stockWarning
                                ? "bg-danger-subtle/80 ring-danger-default/30"
                                : "bg-surface-base/80 ring-border-subtle",
                        ].join(" ")}
                    >
                        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                            {projection.mode === "ajuste"
                                ? "Proyección (ajuste / tipo no entrada-salida)"
                                : "Después del movimiento (estimado)"}
                        </p>
                        <p
                            className={[
                                "mt-1 text-lg font-bold tabular-nums",
                                stockWarning ? "text-danger-strong" : "text-brand-strong",
                            ].join(" ")}
                        >
                            {projection.mode === "ajuste" ? (
                                <span className="text-sm font-medium text-text-secondary">
                                    Revisa cantidad según política del tipo seleccionado.
                                </span>
                            ) : (
                                <>
                                    {formatUnits(projection.after)}
                                    <span className="ml-1 text-sm font-semibold text-text-secondary">UN</span>
                                </>
                            )}
                        </p>
                        {stockWarning ? (
                            <p className="mt-2 text-xs font-medium text-danger-strong">
                                La cantidad supera el disponible en esta ubicación.
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>

            {submitError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {submitError}
                </Alert>
            ) : null}
            {submitSuccess ? (
                <Alert variant="success" className="rounded-xl text-sm">
                    {submitSuccess}
                </Alert>
            ) : null}

            <div
                className="fixed bottom-0 left-0 right-0 z-10 border-t border-border-subtle bg-surface-base/95 py-4 backdrop-blur-sm md:static md:z-0 md:border-0 md:bg-transparent md:py-0 md:backdrop-blur-none"
                style={{
                    paddingLeft: "max(1rem, env(safe-area-inset-left))",
                    paddingRight: "max(1rem, env(safe-area-inset-right))",
                }}
            >
                <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Link
                        href="/dashboard"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border-default bg-surface-sunken px-4 text-sm font-medium text-text-primary transition-all duration-200 hover:bg-surface-hover active:bg-surface-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                        Cancelar
                    </Link>
                    <Button
                        type="button"
                        variant="primary"
                        disabled={stockWarning || submitBusy}
                        isLoading={submitBusy}
                        onClick={() => void onSubmit()}
                    >
                        Guardar movimiento
                    </Button>
                </div>
            </div>
        </div>
    );
}

function formatUnits(n: number) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function InfoCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
    );
}
