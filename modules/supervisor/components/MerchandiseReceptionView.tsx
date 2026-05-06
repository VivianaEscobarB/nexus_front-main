"use client";

import React, { useId, useState } from "react";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const VEHICLE_TYPE_OPTIONS = [
    { value: "truck", label: "Camión" },
    { value: "van", label: "Furgón" },
    { value: "pickup", label: "Pickup" },
];

const TRANSPORT_COMPANY_OPTIONS = [
    { value: "sur", label: "Transportes del Sur S.A.S." },
    { value: "norte", label: "Logística del Norte Ltda." },
    { value: "otro", label: "Otra empresa" },
];

const DOCUMENT_TYPE_OPTIONS = [
    { value: "trace", label: "Planilla de Trazabilidad" },
    { value: "remission", label: "Remisión" },
    { value: "invoice", label: "Factura" },
];

const TRANSPORT_MODE_OPTIONS = [
    { value: "dry", label: "Seco" },
    { value: "refrigerated", label: "Refrigerado" },
];

const SEAL_STATE_OPTIONS = [
    { value: "intact", label: "Intacto" },
    { value: "tampered", label: "Violado" },
];

export function MerchandiseReceptionView() {
    const formId = useId();
    const fileInputId = `${formId}-file`;

    const [plate, setPlate] = useState("WXY-123");
    const [vehicleType, setVehicleType] = useState("truck");
    const [transportCompany, setTransportCompany] = useState("sur");

    const [driverName, setDriverName] = useState("Juan Carlos Ramírez");
    const [driverDoc, setDriverDoc] = useState("1.234.567.809");
    const [driverPhone, setDriverPhone] = useState("312 345 6789");

    const [transportMode, setTransportMode] = useState("refrigerated");
    const [temperature, setTemperature] = useState("4.2");

    const [sealNumber, setSealNumber] = useState("PCT-00098765");
    const [sealState, setSealState] = useState("intact");

    const [docType, setDocType] = useState("trace");
    const [docNumber, setDocNumber] = useState("TRZ-2026-005487");
    const [docDate, setDocDate] = useState("2026-05-20");
    const [mockFileName, setMockFileName] = useState("Planilla_Trazabilidad_005487.pdf (1.2 MB)");

    const [notes, setNotes] = useState("Llegada puntual, sin novedades.");

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-24">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Recepción de mercancía
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                    Registra la información de la recepción de los productos.
                </p>
                <p className="mt-2">
                    <Link
                        href="/dashboard/operador/recepcion-rf"
                        className="text-sm font-semibold text-brand-strong hover:underline"
                    >
                        Entrada con cámara / lector de código (RF)
                    </Link>
                </p>
            </div>

            <Alert variant="warning" className="rounded-xl text-sm">
                <div className="flex flex-wrap items-start gap-2">
                    <Badge variant="warning" label="Demo" size="sm" className="shrink-0" />
                    <span>
                        <strong>Demostración.</strong> Este flujo no envía datos al servidor: es una maqueta del
                        registro formal hasta integrar el API de recepción extendida. Para ingreso real con escaneo
                        usa{" "}
                        <Link
                            href="/dashboard/operador/recepcion-rf"
                            className="font-semibold text-brand-strong hover:underline"
                        >
                            Entrada RF (cámara)
                        </Link>
                        .
                    </span>
                </div>
            </Alert>

            <div className="grid gap-6 lg:grid-cols-[1fr_min(100%,380px)]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader
                            title="Datos de recepción"
                            description="Completa la información mínima para validar ingreso, transporte y seguridad."
                        />
                        <CardBody className="space-y-6">
                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                                    Vehículo
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        label="Placa *"
                                        value={plate}
                                        onChange={(e) => setPlate(e.target.value)}
                                        placeholder="Ej. WXY-123"
                                    />
                                    <Select
                                        label="Tipo de vehículo *"
                                        options={VEHICLE_TYPE_OPTIONS}
                                        value={vehicleType}
                                        onChange={(e) => setVehicleType(e.target.value)}
                                    />
                                    <div className="sm:col-span-2">
                                        <Select
                                            label="Empresa transportadora *"
                                            options={TRANSPORT_COMPANY_OPTIONS}
                                            value={transportCompany}
                                            onChange={(e) => setTransportCompany(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-border-subtle" />

                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                                    Conductor
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <Input
                                            label="Nombre *"
                                            value={driverName}
                                            onChange={(e) => setDriverName(e.target.value)}
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <Input
                                        label="Documento *"
                                        value={driverDoc}
                                        onChange={(e) => setDriverDoc(e.target.value)}
                                        placeholder="Número de identificación"
                                    />
                                    <Input
                                        label="Teléfono *"
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        placeholder="Celular"
                                    />
                                </div>
                            </section>

                            <div className="border-t border-border-subtle" />

                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                                    Transporte y seguridad
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Select
                                        label="Modo de transporte *"
                                        options={TRANSPORT_MODE_OPTIONS}
                                        value={transportMode}
                                        onChange={(e) => setTransportMode(e.target.value)}
                                    />
                                    <Input
                                        label="Temperatura (°C) *"
                                        type="number"
                                        step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        placeholder="Ej. 4.2"
                                    />
                                    <Input
                                        label="Número de precinto *"
                                        value={sealNumber}
                                        onChange={(e) => setSealNumber(e.target.value)}
                                        placeholder="Ej. PCT-00098765"
                                    />
                                    <Select
                                        label="Estado del precinto *"
                                        options={SEAL_STATE_OPTIONS}
                                        value={sealState}
                                        onChange={(e) => setSealState(e.target.value)}
                                    />
                                </div>
                            </section>
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title="Documentos y observaciones" />
                        <CardBody className="space-y-4">
                            <Select
                                label="Tipo de documento *"
                                options={DOCUMENT_TYPE_OPTIONS}
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                            />
                            <Input
                                label="Número de documento *"
                                value={docNumber}
                                onChange={(e) => setDocNumber(e.target.value)}
                                placeholder="Referencia"
                            />
                            <div>
                                <Label htmlFor={`${formId}-doc-date`} required>
                                    Fecha del documento
                                </Label>
                                <input
                                    id={`${formId}-doc-date`}
                                    type="date"
                                    value={docDate}
                                    onChange={(e) => setDocDate(e.target.value)}
                                    className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                                />
                            </div>
                            <div>
                                <Label htmlFor={fileInputId} required>
                                    Adjuntar archivo
                                </Label>
                                <div className="mt-1.5 rounded-lg border border-dashed border-border-default bg-surface-sunken/50 p-4">
                                    <input
                                        id={fileInputId}
                                        type="file"
                                        className="sr-only"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            setMockFileName(f ? `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)` : "");
                                        }}
                                    />
                                    {mockFileName ? (
                                        <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-sm text-text-primary">
                                            <span className="truncate">{mockFileName}</span>
                                            <button
                                                type="button"
                                                className="shrink-0 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-danger-default"
                                                aria-label="Quitar archivo"
                                                onClick={() => {
                                                    setMockFileName("");
                                                    const el = document.getElementById(fileInputId) as HTMLInputElement | null;
                                                    if (el) el.value = "";
                                                }}
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            htmlFor={fileInputId}
                                            className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center text-sm text-text-secondary"
                                        >
                                            <span className="font-medium text-brand-strong">Seleccionar archivo</span>
                                            <span className="text-xs text-text-tertiary">PDF o imagen</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor={`${formId}-notes`}>Observaciones</Label>
                                <textarea
                                    id={`${formId}-notes`}
                                    rows={6}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas adicionales sobre la recepción…"
                                    className="mt-1.5 w-full resize-y rounded-lg border border-border-default bg-surface-base px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                                />
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            <div
                className="fixed bottom-0 left-0 right-0 z-10 border-t border-border-subtle bg-surface-base/95 py-4 backdrop-blur-sm md:static md:z-0 md:border-0 md:bg-transparent md:py-0 md:backdrop-blur-none"
                style={{ paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}
            >
                <div className="mx-auto flex max-w-6xl justify-end gap-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border-default bg-surface-sunken px-4 text-sm font-medium text-text-primary transition-all duration-200 hover:bg-surface-hover active:bg-surface-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                        Cancelar
                    </Link>
                    <Button type="button" variant="primary">
                        Guardar y continuar
                    </Button>
                </div>
            </div>
        </div>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
    );
}
