"use client";

import React, { useId, useMemo, useState } from "react";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { appEnv } from "@/lib/config/env";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const WAREHOUSE_OPTIONS = [
    { value: "bogota-principal", label: "Bodega Principal (Bogotá)" },
    { value: "medellin", label: "Bodega Medellín" },
    { value: "cali", label: "Bodega Cali" },
    { value: "barranquilla", label: "Bodega Barranquilla" },
];

const PRODUCT_OPTIONS = [
    { value: "arroz-super", label: "Arroz Súper Extra" },
    { value: "leche-uht", label: "Leche Entera UHT 1L" },
    { value: "aceite-900", label: "Aceite vegetal 900 ml" },
    { value: "azucar-blanca", label: "Azúcar blanca 1 kg" },
];

export function WarehouseTransferFormView() {
    const formId = useId();

    const [originId, setOriginId] = useState("bogota-principal");
    const [destinationId, setDestinationId] = useState("medellin");
    const [shipDate, setShipDate] = useState("2026-05-20");

    const [productId, setProductId] = useState("arroz-super");
    const [batch, setBatch] = useState("AR-2006-06-10-01");

    const [quantity, setQuantity] = useState("120");
    const [estimatedArrival, setEstimatedArrival] = useState("2026-05-21");

    const [observation, setObservation] = useState("Envío programado por alta demanda.");

    const qtyParsed = useMemo(() => {
        const n = Number.parseFloat(quantity.replace(",", "."));
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [quantity]);

    const sameWarehouse = originId === destinationId;
    const dateOrderInvalid =
        shipDate &&
        estimatedArrival &&
        estimatedArrival.length >= 8 &&
        shipDate.length >= 8 &&
        estimatedArrival < shipDate;

    const canSubmit = !sameWarehouse && qtyParsed > 0 && !dateOrderInvalid;

    const showDemoBanner = !appEnv.warehouseTransferApiEnabled;

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-28">
            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Nueva transferencia entre bodegas
                </h2>
                <p className="text-sm text-text-secondary">
                    {showDemoBanner
                        ? "Flujo de demostración: los datos no se envían al servidor hasta integrar el API de transferencias."
                        : "Registra el traslado de productos entre bodegas."}
                </p>
            </header>

            {showDemoBanner ? (
                <Alert variant="warning" className="rounded-xl text-sm">
                    <strong>Demo.</strong> Pendiente integración con{" "}
                    <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">POST /api/transfers</code>.
                    Las bodegas y productos del formulario son de ejemplo. Cuando el backend esté listo, define{" "}
                    <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">
                        NEXT_PUBLIC_WAREHOUSE_TRANSFER_API_ENABLED=true
                    </code>{" "}
                    para ocultar este aviso.
                </Alert>
            ) : null}

            <Card>
                <CardHeader
                    title="Detalle del traslado"
                    description="Los campos marcados con * son obligatorios. Origen y destino deben ser distintos."
                />
                <CardBody className="space-y-6">
                    {sameWarehouse ? (
                        <p className="rounded-lg border border-warning-default/40 bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
                            Selecciona una bodega de destino distinta al origen.
                        </p>
                    ) : null}
                    {dateOrderInvalid ? (
                        <p className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong">
                            La fecha estimada de llegada no puede ser anterior a la fecha de envío.
                        </p>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-3">
                        <Select
                            label="Bodega origen *"
                            options={WAREHOUSE_OPTIONS}
                            value={originId}
                            onChange={(e) => setOriginId(e.target.value)}
                        />
                        <Select
                            label="Bodega destino *"
                            options={WAREHOUSE_OPTIONS}
                            value={destinationId}
                            onChange={(e) => setDestinationId(e.target.value)}
                        />
                        <div>
                            <Label htmlFor={`${formId}-ship`} required>
                                Fecha envío
                            </Label>
                            <input
                                id={`${formId}-ship`}
                                type="date"
                                value={shipDate}
                                onChange={(e) => setShipDate(e.target.value)}
                                className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Producto *"
                            options={PRODUCT_OPTIONS}
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                        />
                        <Input
                            label="Lote"
                            value={batch}
                            onChange={(e) => setBatch(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-text-secondary">Cantidad *</span>
                            <div className="flex h-10 max-w-full items-stretch gap-2 rounded-lg border border-border-default bg-surface-base transition-colors focus-within:border-border-focus focus-within:ring-2 focus-within:ring-brand-default/20">
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-text-primary outline-none focus:ring-0"
                                    aria-describedby={`${formId}-qty-unit`}
                                />
                                <span
                                    id={`${formId}-qty-unit`}
                                    className="flex shrink-0 items-center border-l border-border-subtle px-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary"
                                >
                                    UN
                                </span>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor={`${formId}-arrival`}>Fecha estimada llegada</Label>
                            <input
                                id={`${formId}-arrival`}
                                type="date"
                                value={estimatedArrival}
                                onChange={(e) => setEstimatedArrival(e.target.value)}
                                className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor={`${formId}-obs`} muted>
                            Observación
                        </Label>
                        <textarea
                            id={`${formId}-obs`}
                            rows={4}
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Motivo del traslado, prioridad, contacto en destino…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-border-default bg-surface-base px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                        />
                    </div>
                </CardBody>
            </Card>

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
                    <Button type="button" variant="primary" disabled={!canSubmit}>
                        Crear transferencia
                    </Button>
                </div>
            </div>
        </div>
    );
}
