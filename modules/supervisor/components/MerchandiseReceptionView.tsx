"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
    createInventoryReceptionExpectedLines,
    createInventoryReception,
    listActiveInventoryReceptions,
} from "@/modules/warehouse/api/operatorInventoryApi";
import type {
    ActiveReceptionConflictDetails,
    CreateReceptionExpectedLineInput,
} from "@/modules/warehouse/api/operatorInventoryTypes";
import { listWarehouses, type ManagedWarehouse } from "@/modules/infrastructure";
import { isApiError } from "@/shared/api/apiError";

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

type ParsedExpectedLine = CreateReceptionExpectedLineInput;

function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");
}

function isTruthyFlag(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "si", "sí", "yes", "y", "x"].includes(normalized);
}

function pickFirst(obj: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
        const value = obj[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return "";
}

function parseDelimitedText(text: string, separator: "," | ";" | "\t"): ParsedExpectedLine[] {
    const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (rows.length < 2) return [];

    const headers = rows[0].split(separator).map((h) => normalizeHeader(h));
    const lines: ParsedExpectedLine[] = [];

    for (let i = 1; i < rows.length; i += 1) {
        const cols = rows[i].split(separator).map((c) => c.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
            row[header] = cols[idx] ?? "";
        });

        const barcode = pickFirst(row, ["barcode", "codigobarras", "codigo", "ean", "gtin", "code"]);
        const quantityRaw = pickFirst(row, ["expectedquantity", "cantidad", "qty", "quantity", "unidades"]);
        const expectedQuantity = Number.parseInt(quantityRaw, 10);
        if (!barcode || !Number.isFinite(expectedQuantity) || expectedQuantity <= 0) {
            continue;
        }

        const productName = pickFirst(row, ["productname", "producto", "nombre", "descripcion", "description"]);
        const productSku = pickFirst(row, ["productsku", "sku", "externalsku", "referencia", "externalproductref"]);
        const requiresLotRaw = pickFirst(row, ["requireslot", "requiere_lote", "requierelote", "loterequerido"]);

        lines.push({
            barcode,
            expectedQuantity,
            productName,
            productSku,
            requiresLot: requiresLotRaw ? isTruthyFlag(requiresLotRaw) : false,
        });
    }

    return lines;
}

function parseJsonText(text: string): ParsedExpectedLine[] {
    const parsed = JSON.parse(text) as unknown;
    const rawList = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "items" in parsed
          ? (parsed as { items: unknown }).items
          : [];
    if (!Array.isArray(rawList)) return [];

    const lines: ParsedExpectedLine[] = [];
    for (const entry of rawList) {
        const row = (entry ?? {}) as Record<string, unknown>;
        const barcode = String(
            row.barcode ?? row.codigoBarras ?? row.code ?? row.ean ?? ""
        ).trim();
        const expectedQuantity = Number(
            row.expectedQuantity ?? row.quantity ?? row.qty ?? row.cantidad ?? 0
        );
        if (!barcode || !Number.isFinite(expectedQuantity) || expectedQuantity <= 0) {
            continue;
        }
        lines.push({
            barcode,
            expectedQuantity: Math.floor(expectedQuantity),
            productName: String(row.productName ?? row.product ?? row.nombre ?? "").trim(),
            productSku: String(row.productSku ?? row.sku ?? row.externalProductRef ?? "").trim(),
            requiresLot: Boolean(row.requiresLot ?? row.requireLot ?? false),
        });
    }
    return lines;
}

function dedupeExpectedLines(lines: ParsedExpectedLine[]): ParsedExpectedLine[] {
    const byBarcode = new Map<string, ParsedExpectedLine>();
    for (const line of lines) {
        const key = line.barcode.trim();
        const existing = byBarcode.get(key);
        if (!existing) {
            byBarcode.set(key, { ...line, barcode: key });
            continue;
        }
        byBarcode.set(key, {
            ...existing,
            expectedQuantity: existing.expectedQuantity + line.expectedQuantity,
            productName: existing.productName || line.productName,
            productSku: existing.productSku || line.productSku,
            requiresLot: Boolean(existing.requiresLot || line.requiresLot),
        });
    }
    return [...byBarcode.values()];
}

async function extractExpectedLinesFromFile(file: File): Promise<ParsedExpectedLine[]> {
    const lowerName = file.name.toLowerCase();
    const text = await file.text();

    if (lowerName.endsWith(".json")) {
        return dedupeExpectedLines(parseJsonText(text));
    }
    if (lowerName.endsWith(".csv")) {
        return dedupeExpectedLines(parseDelimitedText(text, ","));
    }
    if (lowerName.endsWith(".tsv")) {
        return dedupeExpectedLines(parseDelimitedText(text, "\t"));
    }
    if (lowerName.endsWith(".txt")) {
        const bySemicolon = parseDelimitedText(text, ";");
        if (bySemicolon.length > 0) return dedupeExpectedLines(bySemicolon);
        return dedupeExpectedLines(parseDelimitedText(text, ","));
    }

    throw new Error("UNSUPPORTED_FILE_TYPE");
}

export function MerchandiseReceptionView() {
    const formId = useId();
    const fileInputId = `${formId}-file`;
    const router = useRouter();
    const [warehouseId, setWarehouseId] = useState("");
    const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
    const [warehouseLoadBusy, setWarehouseLoadBusy] = useState(true);
    const [warehouseLoadError, setWarehouseLoadError] = useState<string | null>(null);
    const [saveBusy, setSaveBusy] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const saveAttemptRef = useRef<{
        warehouseId: number;
        clientRequestId: string;
        createdAt: number;
    } | null>(null);

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
    const [supplierName, setSupplierName] = useState("Proveedor externo");
    const [mockFileName, setMockFileName] = useState("Planilla_Trazabilidad_005487.pdf (1.2 MB)");
    const [fileParseBusy, setFileParseBusy] = useState(false);
    const [fileParseMessage, setFileParseMessage] = useState<string | null>(null);
    const [fileParseError, setFileParseError] = useState<string | null>(null);
    const [expectedLines, setExpectedLines] = useState<CreateReceptionExpectedLineInput[]>([
        {
            barcode: "",
            expectedQuantity: 1,
            productName: "",
            productSku: "",
            requiresLot: false,
        },
    ]);

    const [notes, setNotes] = useState("Llegada puntual, sin novedades.");

    const candidateWarehouses = useMemo(() => {
        return warehouses
            .map((w) => ({
                value: w.id,
                label: `${w.name} (${w.code})`,
            }));
    }, [warehouses]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setWarehouseLoadBusy(true);
            setWarehouseLoadError(null);
            try {
                const [allWarehouses, activeReceptions] = await Promise.all([
                    listWarehouses(),
                    listActiveInventoryReceptions(),
                ]);
                if (cancelled) return;

                const blockedWarehouseIds = new Set(
                    activeReceptions
                        .map((r) => r.warehouseId)
                        .filter((id) => Number.isFinite(id))
                );

                const candidates = allWarehouses.filter((w) => {
                    const id = Number.parseInt(w.id, 10);
                    if (!Number.isFinite(id)) return false;
                    if (blockedWarehouseIds.has(id)) return false;
                    return w.active !== false;
                });

                setWarehouses(candidates);
                setWarehouseId(candidates[0]?.id ?? "");
            } catch (error) {
                if (cancelled) return;
                setWarehouses([]);
                setWarehouseId("");
                setWarehouseLoadError(
                    isApiError(error)
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : "No fue posible cargar las bodegas disponibles."
                );
            } finally {
                if (!cancelled) {
                    setWarehouseLoadBusy(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSaveAndContinue() {
        const parsedWarehouseId = Number.parseInt(warehouseId, 10);
        if (!Number.isFinite(parsedWarehouseId) || parsedWarehouseId <= 0) {
            setSaveError("Selecciona una bodega disponible para abrir la recepción.");
            return;
        }

        setSaveBusy(true);
        setSaveError(null);
        setSaveMessage(null);
        try {
            // Evita choques: si ya hay una recepción activa para esta bodega, reutilízala.
            const activeBeforeCreate = await listActiveInventoryReceptions();
            const existing = activeBeforeCreate.find(
                (r) => r.warehouseId === parsedWarehouseId
            );
            if (existing) {
                const validLines = expectedLines.filter(
                    (line) => line.barcode.trim().length > 0 && line.expectedQuantity > 0
                );
                if (validLines.length > 0) {
                    await createInventoryReceptionExpectedLines(existing.id, validLines);
                }
                setSaveMessage(
                    `Ya existe una recepción activa (#${existing.id}). Continuando en el flujo RF...`
                );
                router.push(
                    `/dashboard/operador/recepcion-rf?receptionId=${existing.id}&warehouseId=${existing.warehouseId}&documentRef=${encodeURIComponent(docNumber)}&supplier=${encodeURIComponent(supplierName)}`
                );
                return;
            }

            const now = Date.now();
            const previousAttempt = saveAttemptRef.current;
            const reuseAttempt =
                previousAttempt &&
                previousAttempt.warehouseId === parsedWarehouseId &&
                now - previousAttempt.createdAt < 30_000;
            const clientRequestId = reuseAttempt
                ? previousAttempt.clientRequestId
                : crypto.randomUUID();
            saveAttemptRef.current = {
                warehouseId: parsedWarehouseId,
                clientRequestId,
                createdAt: now,
            };

            const reception = await createInventoryReception({
                warehouseId: parsedWarehouseId,
                clientRequestId,
                expectedDocumentRef: docNumber.trim() || undefined,
            });
            const validLines = expectedLines.filter(
                (line) => line.barcode.trim().length > 0 && line.expectedQuantity > 0
            );
            if (validLines.length > 0) {
                await createInventoryReceptionExpectedLines(reception.id, validLines);
            }
            setSaveMessage(
                `Recepción #${reception.id} creada en estado ${reception.status}. Redirigiendo al flujo RF...`
            );
            saveAttemptRef.current = null;
            router.push(
                `/dashboard/operador/recepcion-rf?receptionId=${reception.id}&warehouseId=${reception.warehouseId}&documentRef=${encodeURIComponent(docNumber)}&supplier=${encodeURIComponent(supplierName)}`
            );
        } catch (error) {
            if (isApiError(error) && error.status === 409) {
                const details = (error.details ?? null) as ActiveReceptionConflictDetails | null;
                if (
                    error.code === "ACTIVE_RECEPTION_EXISTS" &&
                    details?.existingReceptionId &&
                    Number.isFinite(details.existingReceptionId)
                ) {
                    const resumeWarehouseId =
                        details.warehouseId ?? parsedWarehouseId;
                    setSaveMessage(
                        `Ya existe una recepción activa (#${details.existingReceptionId}). Continuando en el flujo RF...`
                    );
                    router.push(
                        `/dashboard/operador/recepcion-rf?receptionId=${details.existingReceptionId}&warehouseId=${resumeWarehouseId}&documentRef=${encodeURIComponent(docNumber)}&supplier=${encodeURIComponent(supplierName)}`
                    );
                    return;
                }
                try {
                    const activeReceptions = await listActiveInventoryReceptions();
                    const active =
                        activeReceptions.find(
                            (r) => r.warehouseId === parsedWarehouseId
                        ) ?? activeReceptions[0];
                    if (active) {
                        setSaveMessage(
                            `Ya existe una recepción activa (#${active.id}). Continuando en el flujo RF...`
                        );
                        router.push(
                            `/dashboard/operador/recepcion-rf?receptionId=${active.id}&warehouseId=${active.warehouseId}&documentRef=${encodeURIComponent(docNumber)}&supplier=${encodeURIComponent(supplierName)}`
                        );
                        return;
                    }
                } catch {
                    // si falla la consulta de activas, mostramos el 409 original
                }
            }
            setSaveError(
                isApiError(error)
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "No fue posible crear la recepción en este momento."
            );
        } finally {
            setSaveBusy(false);
        }
    }

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
                        <strong>Integración parcial.</strong> El botón <strong>Guardar y continuar</strong> ahora
                        crea la recepción real en API. El resto de campos de este formulario todavía funcionan como
                        maqueta de captura extendida. Para ingreso real con escaneo usa{" "}
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
            {saveError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {saveError}
                </Alert>
            ) : null}
            {saveMessage ? (
                <Alert variant="success" className="rounded-xl text-sm">
                    {saveMessage}
                </Alert>
            ) : null}
            {warehouseLoadError ? (
                <Alert variant="danger" className="rounded-xl text-sm">
                    {warehouseLoadError}
                </Alert>
            ) : null}
            {!warehouseLoadBusy && !warehouseLoadError && candidateWarehouses.length === 0 ? (
                <Alert variant="warning" className="rounded-xl text-sm">
                    No hay bodegas candidatas para una nueva recepción (todas tienen una recepción activa).
                </Alert>
            ) : null}

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
                                <Select
                                    label="Bodega candidata *"
                                    options={candidateWarehouses}
                                    value={warehouseId}
                                    onChange={(e) => setWarehouseId(e.target.value)}
                                    disabled={warehouseLoadBusy || candidateWarehouses.length === 0}
                                />
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
                            <Input
                                label="Proveedor *"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                placeholder="Nombre del proveedor"
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
                                        accept=".csv,.tsv,.txt,.json,.pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            setFileParseMessage(null);
                                            setFileParseError(null);
                                            setMockFileName(f ? `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)` : "");
                                            if (!f) return;
                                            void (async () => {
                                                setFileParseBusy(true);
                                                try {
                                                    const lines = await extractExpectedLinesFromFile(f);
                                                    if (lines.length === 0) {
                                                        setFileParseError(
                                                            "El archivo no contiene líneas válidas. Usa columnas: barcode/codigo, expectedQuantity/cantidad."
                                                        );
                                                        return;
                                                    }
                                                    setExpectedLines(lines);
                                                    setFileParseMessage(
                                                        `Se cargaron ${lines.length} línea(s) esperadas desde el documento.`
                                                    );
                                                } catch (error) {
                                                    if (
                                                        error instanceof Error &&
                                                        error.message === "UNSUPPORTED_FILE_TYPE"
                                                    ) {
                                                        setFileParseError(
                                                            "Formato no extraíble automáticamente. Usa CSV/TSV/TXT/JSON para cargar productos; PDF/imagen se mantienen como soporte documental."
                                                        );
                                                        return;
                                                    }
                                                    setFileParseError(
                                                        "No fue posible leer el archivo. Verifica estructura y vuelve a intentar."
                                                    );
                                                } finally {
                                                    setFileParseBusy(false);
                                                }
                                            })();
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
                                                    setFileParseMessage(null);
                                                    setFileParseError(null);
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
                                {fileParseBusy ? (
                                    <p className="mt-2 text-xs text-text-secondary">Extrayendo productos del documento…</p>
                                ) : null}
                                {fileParseMessage ? (
                                    <p className="mt-2 text-xs text-success-default">{fileParseMessage}</p>
                                ) : null}
                                {fileParseError ? (
                                    <p className="mt-2 text-xs text-danger-text">{fileParseError}</p>
                                ) : null}
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
                            <div className="rounded-lg border border-border-subtle p-3">
                                <p className="text-sm font-semibold text-text-primary">Líneas esperadas del pedido</p>
                                <div className="mt-3 space-y-3">
                                    {expectedLines.map((line, index) => (
                                        <div key={index} className="grid gap-2 sm:grid-cols-2">
                                            <Input
                                                label="Código de barras *"
                                                value={line.barcode}
                                                onChange={(e) => {
                                                    const barcode = e.target.value;
                                                    setExpectedLines((prev) =>
                                                        prev.map((entry, i) =>
                                                            i === index ? { ...entry, barcode } : entry
                                                        )
                                                    );
                                                }}
                                            />
                                            <Input
                                                label="Cantidad esperada *"
                                                type="number"
                                                min={1}
                                                value={String(line.expectedQuantity)}
                                                onChange={(e) => {
                                                    const qty = Number.parseInt(e.target.value, 10);
                                                    setExpectedLines((prev) =>
                                                        prev.map((entry, i) =>
                                                            i === index
                                                                ? {
                                                                      ...entry,
                                                                      expectedQuantity:
                                                                          Number.isFinite(qty) && qty > 0 ? qty : 1,
                                                                  }
                                                                : entry
                                                        )
                                                    );
                                                }}
                                            />
                                            <Input
                                                label="Nombre producto (opcional)"
                                                value={line.productName ?? ""}
                                                onChange={(e) => {
                                                    const productName = e.target.value;
                                                    setExpectedLines((prev) =>
                                                        prev.map((entry, i) =>
                                                            i === index ? { ...entry, productName } : entry
                                                        )
                                                    );
                                                }}
                                            />
                                            <Input
                                                label="SKU proveedor (opcional)"
                                                value={line.productSku ?? ""}
                                                onChange={(e) => {
                                                    const productSku = e.target.value;
                                                    setExpectedLines((prev) =>
                                                        prev.map((entry, i) =>
                                                            i === index ? { ...entry, productSku } : entry
                                                        )
                                                    );
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setExpectedLines((prev) => [
                                                    ...prev,
                                                    {
                                                        barcode: "",
                                                        expectedQuantity: 1,
                                                        productName: "",
                                                        productSku: "",
                                                        requiresLot: false,
                                                    },
                                                ])
                                            }
                                        >
                                            Agregar línea
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={expectedLines.length <= 1}
                                            onClick={() =>
                                                setExpectedLines((prev) =>
                                                    prev.length > 1 ? prev.slice(0, -1) : prev
                                                )
                                            }
                                        >
                                            Quitar última
                                        </Button>
                                    </div>
                                </div>
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
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => void handleSaveAndContinue()}
                        isLoading={saveBusy}
                        disabled={
                            saveBusy ||
                            warehouseLoadBusy ||
                            Boolean(warehouseLoadError) ||
                            candidateWarehouses.length === 0 ||
                            !warehouseId
                        }
                    >
                        {saveBusy ? "Guardando..." : "Guardar y continuar"}
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
