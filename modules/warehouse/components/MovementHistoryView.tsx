"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { appEnv } from "@/lib/config/env";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { listRecentMovements } from "@/modules/warehouse/api/operatorInventoryApi";
import type { InventoryMovementResponse } from "@/modules/warehouse/api/operatorInventoryTypes";
import { getKardex } from "@/modules/supervisor/api/supervisorWarehouseApi";
import type { JsonRecord } from "@/modules/supervisor/api/supervisorWarehouseTypes";
import { pickFirstString } from "@/modules/supervisor/api/supervisorWarehouseDisplay";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { UserRole } from "@/types";
import { userHasRole } from "@/shared/auth/primaryRole";
import { isApiError } from "@/shared/api/apiError";

const TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "Todos" },
    { value: "entrada", label: "Entrada" },
    { value: "salida", label: "Salida" },
    { value: "ajuste", label: "Ajuste" },
] as const;

type MovementKind = "entrada" | "salida" | "ajuste";

type HistoryRow = {
    id: string;
    /** ISO local datetime for sorting: yyyy-mm-ddTHH:mm */
    at: string;
    type: MovementKind;
    subtype: string;
    product: string;
    quantity: number;
    userLabel: string;
    observation: string;
};

const MOCK_ROWS: HistoryRow[] = [
    {
        id: "1",
        at: "2026-05-20T10:30",
        type: "entrada",
        subtype: "Recepción",
        product: "Leche Entera UHT 1L",
        quantity: 48,
        userLabel: "Operador",
        observation: "Ingreso por REC-000123.",
    },
    {
        id: "2",
        at: "2026-05-20T11:15",
        type: "salida",
        subtype: "Despacho",
        product: "Arroz Súper Extra",
        quantity: 120,
        userLabel: "Operador",
        observation: "Despacho a cliente.",
    },
    {
        id: "3",
        at: "2026-05-20T12:05",
        type: "ajuste",
        subtype: "Recuento",
        product: "Queso Mozzarella 500g",
        quantity: 5,
        userLabel: "Supervisor",
        observation: "Diferencia inventario.",
    },
    {
        id: "4",
        at: "2026-05-20T14:20",
        type: "salida",
        subtype: "Transferencia",
        product: "Leche Entera UHT 1L",
        quantity: 100,
        userLabel: "Operador",
        observation: "Envío a Medellín.",
    },
    {
        id: "5",
        at: "2026-05-19T09:00",
        type: "entrada",
        subtype: "Devolución",
        product: "Azúcar blanca 1 kg",
        quantity: 24,
        userLabel: "Operador",
        observation: "Devolución cliente zona norte.",
    },
    {
        id: "6",
        at: "2026-05-18T16:45",
        type: "ajuste",
        subtype: "Corrección",
        product: "Aceite vegetal 900 ml",
        quantity: 2,
        userLabel: "Supervisor",
        observation: "Ajuste por lectura errónea de lote.",
    },
];

const PAGE_SIZE = 4;

function formatDateTime(iso: string): string {
    const [datePart, timePart] = iso.split("T");
    if (!datePart || !timePart) return iso;
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y} ${timePart}`;
}

function typeBadge(type: MovementKind) {
    switch (type) {
        case "entrada":
            return <Badge variant="success" label="Entrada" size="sm" />;
        case "salida":
            return <Badge variant="danger" label="Salida" size="sm" />;
        case "ajuste":
            return <Badge variant="warning" label="Ajuste" size="sm" />;
        default:
            return <Badge variant="neutral" label="—" size="sm" />;
    }
}

function quantityClass(type: MovementKind): string {
    switch (type) {
        case "entrada":
            return "font-semibold tabular-nums text-success-text";
        case "salida":
            return "font-semibold tabular-nums text-danger-text";
        case "ajuste":
            return "font-semibold tabular-nums text-warning-text";
        default:
            return "font-semibold tabular-nums text-text-secondary";
    }
}

function parseDateOnly(iso: string): string | null {
    const day = iso.slice(0, 10);
    return day.length === 10 ? day : null;
}

function movementKindFromMovementRow(m: InventoryMovementResponse): MovementKind {
    const blob = `${m.movementTypeName} ${m.movementSubtypeName ?? ""}`.toUpperCase();
    if (blob.includes("SALIDA") || blob.includes("SALID")) return "salida";
    if (blob.includes("AJUST") || blob.includes("RECUENT") || blob.includes("CORRECC")) {
        return "ajuste";
    }
    return "entrada";
}

function formatMovementDateTime(iso: string): string {
    const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
    const d = new Date(normalized);
    if (!Number.isFinite(d.getTime())) {
        return iso.length >= 16 ? iso.slice(0, 16).replace("T", " ") : iso;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MovementHistoryView() {
    const formId = useId();
    const { user } = useAuth();
    const showKardex = userHasRole(user?.roles, UserRole.WAREHOUSE_SUPERVISOR);

    const [activeSource, setActiveSource] = useState<"history" | "kardex" | "recent">("history");
    const operatorDefaultApplied = useRef(false);

    const [recentRows, setRecentRows] = useState<InventoryMovementResponse[]>([]);
    const [recentLoading, setRecentLoading] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);

    const [draftFrom, setDraftFrom] = useState("2026-05-01");
    const [draftTo, setDraftTo] = useState("2026-05-20");
    const [draftType, setDraftType] = useState<string>("ALL");

    const [appliedFrom, setAppliedFrom] = useState("2026-05-01");
    const [appliedTo, setAppliedTo] = useState("2026-05-20");
    const [appliedType, setAppliedType] = useState<string>("ALL");

    const [page, setPage] = useState(1);

    const [kardexProductId, setKardexProductId] = useState("");
    const [kDraftFrom, setKDraftFrom] = useState("2026-05-01");
    const [kDraftTo, setKDraftTo] = useState("2026-05-20");
    const [kAppliedFrom, setKAppliedFrom] = useState("2026-05-01");
    const [kAppliedTo, setKAppliedTo] = useState("2026-05-20");
    const [kAppliedProductId, setKAppliedProductId] = useState("");
    const [kardexRows, setKardexRows] = useState<JsonRecord[]>([]);
    const [kardexLoading, setKardexLoading] = useState(false);
    const [kardexError, setKardexError] = useState<string | null>(null);
    const [kPage, setKPage] = useState(1);

    useEffect(() => {
        if (!user || operatorDefaultApplied.current) return;
        if (!showKardex) {
            operatorDefaultApplied.current = true;
            setActiveSource("recent");
        }
    }, [user, showKardex]);

    const loadRecentMovements = useCallback(async () => {
        setRecentLoading(true);
        setRecentError(null);
        try {
            const rows = await listRecentMovements();
            setRecentRows(rows);
        } catch (e) {
            setRecentRows([]);
            setRecentError(
                isApiError(e)
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "No fue posible cargar los movimientos recientes."
            );
        } finally {
            setRecentLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showKardex || activeSource !== "recent") return;
        void loadRecentMovements();
    }, [showKardex, activeSource, loadRecentMovements]);

    const filtered = useMemo(() => {
        return MOCK_ROWS.filter((row) => {
            const day = parseDateOnly(row.at);
            if (!day) return false;
            if (appliedFrom && day < appliedFrom) return false;
            if (appliedTo && day > appliedTo) return false;
            if (appliedType !== "ALL" && row.type !== appliedType) return false;
            return true;
        }).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    }, [appliedFrom, appliedTo, appliedType]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const effectivePage = Math.min(page, totalPages);
    const startIdx = (effectivePage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    const startRecord = filtered.length === 0 ? 0 : startIdx + 1;
    const endRecord = startIdx + pageRows.length;

    function handleSearch() {
        setAppliedFrom(draftFrom);
        setAppliedTo(draftTo);
        setAppliedType(draftType);
        setPage(1);
    }

    function handleClear() {
        setDraftFrom("2026-05-01");
        setDraftTo("2026-05-20");
        setDraftType("ALL");
        setAppliedFrom("2026-05-01");
        setAppliedTo("2026-05-20");
        setAppliedType("ALL");
        setPage(1);
    }

    const dateOrderInvalid = Boolean(draftFrom && draftTo && draftTo < draftFrom);
    const kardexDateInvalid = Boolean(kDraftFrom && kDraftTo && kDraftTo < kDraftFrom);

    const kFiltered = kardexRows;
    const K_PAGE_SIZE = PAGE_SIZE;
    const kTotalPages = Math.max(1, Math.ceil(kFiltered.length / K_PAGE_SIZE));
    const kEffectivePage = Math.min(kPage, kTotalPages);
    const kStart = (kEffectivePage - 1) * K_PAGE_SIZE;
    const kPageRows = kFiltered.slice(kStart, kStart + K_PAGE_SIZE);

    async function handleKardexSearch() {
        const pid = kardexProductId.trim();
        if (!pid) {
            setKardexError("Indica el ID del producto para consultar el kardex.");
            setKardexRows([]);
            return;
        }
        if (kardexDateInvalid) {
            setKardexError("La fecha hasta no puede ser anterior a la fecha desde.");
            return;
        }
        setKardexLoading(true);
        setKardexError(null);
        setKAppliedFrom(kDraftFrom);
        setKAppliedTo(kDraftTo);
        setKAppliedProductId(pid);
        setKPage(1);
        try {
            const rows = await getKardex({
                productId: pid,
                dateFrom: kDraftFrom,
                dateTo: kDraftTo,
            });
            setKardexRows(rows);
        } catch (e) {
            setKardexRows([]);
            setKardexError(
                isApiError(e)
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : appEnv.isDevelopment
                        ? "No fue posible cargar el kardex (GET /api/kardex)."
                        : "No fue posible cargar el kardex."
            );
        } finally {
            setKardexLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-10">
            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Historial de movimientos
                </h2>
                <p className="text-sm text-text-secondary">
                    {showKardex
                        ? "Elige entre movimientos de ejemplo o el kardex cuando el servicio esté activo."
                        : "Consulta movimientos recientes registrados en el sistema o usa la tabla de ejemplo como referencia de maqueta."}
                </p>
            </header>

            {!showKardex && activeSource === "history" ? (
                <Alert variant="warning" className="rounded-xl text-sm">
                    <strong>Vista de demostración.</strong> Las filas no provienen del servidor; sirven para maquetar
                    el flujo hasta contar con un histórico consolidado. Para datos reales usa{" "}
                    <strong>Movimientos recientes</strong>.
                </Alert>
            ) : null}

            {!showKardex ? (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveSource("recent")}
                        className={[
                            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            activeSource === "recent"
                                ? "bg-surface-base text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary",
                        ].join(" ")}
                    >
                        Movimientos recientes
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSource("history")}
                        className={[
                            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            activeSource === "history"
                                ? "bg-surface-base text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary",
                        ].join(" ")}
                    >
                        {appEnv.isDevelopment ? "Ejemplo (sin API)" : "Ejemplo"}
                    </button>
                </div>
            ) : null}

            {showKardex ? (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveSource("history")}
                        className={[
                            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            activeSource === "history"
                                ? "bg-surface-base text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary",
                        ].join(" ")}
                    >
                        {appEnv.isDevelopment ? "Ejemplo (sin API)" : "Ejemplo"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSource("kardex")}
                        className={[
                            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            activeSource === "kardex"
                                ? "bg-surface-base text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary",
                        ].join(" ")}
                    >
                        {appEnv.isDevelopment ? "Kardex (API)" : "Kardex"}
                    </button>
                </div>
            ) : null}

            {activeSource === "kardex" && showKardex ? (
                <>
                    <Card>
                        <CardBody className="space-y-4">
                            {kardexDateInvalid ? (
                                <p className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong">
                                    La fecha hasta no puede ser anterior a la fecha desde.
                                </p>
                            ) : null}
                            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                                <div className="min-w-[12rem] flex-1">
                                    <Input
                                        label="ID producto"
                                        placeholder={
                                            appEnv.isDevelopment
                                                ? "Obligatorio — consulta kardex (GET /api/kardex)"
                                                : "ID numérico del producto"
                                        }
                                        value={kardexProductId}
                                        onChange={(e) => setKardexProductId(e.target.value)}
                                    />
                                </div>
                                <div className="min-w-[10rem] flex-1">
                                    <Label htmlFor={`${formId}-k-from`}>Fecha desde</Label>
                                    <input
                                        id={`${formId}-k-from`}
                                        type="date"
                                        value={kDraftFrom}
                                        onChange={(e) => setKDraftFrom(e.target.value)}
                                        className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                                    />
                                </div>
                                <div className="min-w-[10rem] flex-1">
                                    <Label htmlFor={`${formId}-k-to`}>Fecha hasta</Label>
                                    <input
                                        id={`${formId}-k-to`}
                                        type="date"
                                        value={kDraftTo}
                                        onChange={(e) => setKDraftTo(e.target.value)}
                                        className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                                    />
                                </div>
                                <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="min-w-[7.5rem]"
                                        leftIcon={<MagnifyingGlassMini className="h-4 w-4" />}
                                        onClick={() => void handleKardexSearch()}
                                        disabled={kardexLoading || kardexDateInvalid}
                                    >
                                        {kardexLoading ? "Cargando…" : "Consultar"}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-text-tertiary">
                                Última consulta: producto{" "}
                                <span className="font-mono text-text-secondary">
                                    {kAppliedProductId || "—"}
                                </span>{" "}
                                · {kAppliedFrom} → {kAppliedTo}
                            </p>
                        </CardBody>
                    </Card>

                    {kardexError ? (
                        <p className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong">
                            {kardexError}
                        </p>
                    ) : null}

                    <Card>
                        <CardBody padding="none">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-surface-sunken/50">
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Fecha
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Movimiento
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Referencia
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Entrada
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Salida
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Saldo
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                        {kPageRows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-6 py-12 text-center text-text-tertiary"
                                                >
                                                    {kardexLoading
                                                        ? "Cargando movimientos…"
                                                        : appEnv.isDevelopment
                                                          ? "Sin filas. Confirma que GET /api/kardex esté desplegado y que el rango sea correcto."
                                                          : "Sin movimientos en este rango o el servicio de kardex no está disponible."}
                                                </td>
                                            </tr>
                                        ) : (
                                            kPageRows.map((row, idx) => (
                                                <tr
                                                    key={pickFirstString(row, ["id", "lineId"]) ?? `k-${kStart + idx}`}
                                                    className="bg-surface-base hover:bg-surface-sunken/30"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                        {pickFirstString(row, [
                                                            "movementDate",
                                                            "date",
                                                            "at",
                                                            "timestamp",
                                                            "createdAt",
                                                        ]) ?? "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-text-primary md:px-6">
                                                        {pickFirstString(row, [
                                                            "movementType",
                                                            "type",
                                                            "concept",
                                                            "description",
                                                        ]) ?? "—"}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-text-secondary md:px-6">
                                                        {pickFirstString(row, [
                                                            "reference",
                                                            "document",
                                                            "docNumber",
                                                            "note",
                                                        ]) ?? "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-success-text md:px-6">
                                                        {pickFirstString(row, ["inQty", "quantityIn", "entry"]) ?? "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-danger-text md:px-6">
                                                        {pickFirstString(row, ["outQty", "quantityOut", "exit"]) ?? "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-text-primary md:px-6">
                                                        {pickFirstString(row, ["balance", "runningBalance", "stock"]) ??
                                                            "—"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
                                <p className="text-sm text-text-tertiary">
                                    {kFiltered.length} movimiento(s) · página {kEffectivePage} / {kTotalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="px-2"
                                        disabled={kEffectivePage <= 1}
                                        onClick={() => setKPage((p) => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="px-2"
                                        disabled={kEffectivePage >= kTotalPages}
                                        onClick={() => setKPage((p) => Math.min(kTotalPages, p + 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </>
            ) : !showKardex && activeSource === "recent" ? (
                <>
                    <Alert variant="info" className="rounded-xl text-sm text-text-primary">
                        <strong>Movimientos recientes.</strong> Lista devuelta por el servicio de inventario (últimos
                        registros). No reemplaza un histórico completo ni la vista kardex del supervisor.
                        {appEnv.isDevelopment ? (
                            <span className="mt-1 block font-mono text-xs text-text-tertiary">
                                GET /api/inventory/movements/recent
                            </span>
                        ) : null}
                    </Alert>
                    <Card>
                        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-text-secondary">
                                {recentLoading
                                    ? "Cargando movimientos…"
                                    : recentError
                                      ? "Revisa el mensaje de error o reintenta."
                                      : `${recentRows.length} movimiento(s) en esta lista.`}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void loadRecentMovements()}
                                disabled={recentLoading}
                                leftIcon={<ArrowPathMini className="h-4 w-4" />}
                            >
                                Actualizar
                            </Button>
                        </CardBody>
                    </Card>
                    {recentError ? (
                        <Alert variant="danger" className="rounded-xl text-sm">
                            {recentError}
                        </Alert>
                    ) : null}
                    <Card>
                        <CardBody padding="none">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-surface-sunken/50">
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Fecha
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Tipo
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Subtipo
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Producto
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Espacio
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Cantidad
                                            </th>
                                            <th className="min-w-[10rem] px-4 py-3 font-semibold text-text-secondary md:px-6">
                                                Nota
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                        {!recentLoading && recentRows.length === 0 && !recentError ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-6 py-12 text-center text-text-tertiary"
                                                >
                                                    No hay movimientos recientes para mostrar.
                                                </td>
                                            </tr>
                                        ) : null}
                                        {recentLoading ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-6 py-12 text-center text-text-tertiary"
                                                >
                                                    Cargando…
                                                </td>
                                            </tr>
                                        ) : null}
                                        {!recentLoading
                                            ? [...recentRows]
                                                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                                                  .map((row) => {
                                                      const kind = movementKindFromMovementRow(row);
                                                      return (
                                                          <tr
                                                              key={row.id}
                                                              className="bg-surface-base hover:bg-surface-sunken/30"
                                                          >
                                                              <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                                  {formatMovementDateTime(row.createdAt)}
                                                              </td>
                                                              <td className="px-4 py-3 md:px-6">
                                                                  <div className="flex flex-col gap-1">
                                                                      {typeBadge(kind)}
                                                                      <span className="text-xs text-text-secondary">
                                                                          {row.movementTypeName}
                                                                      </span>
                                                                  </div>
                                                              </td>
                                                              <td className="whitespace-nowrap px-4 py-3 text-text-primary md:px-6">
                                                                  {row.movementSubtypeName ?? "—"}
                                                              </td>
                                                              <td className="px-4 py-3 font-mono text-xs text-text-secondary md:px-6">
                                                                  #{row.productId}
                                                              </td>
                                                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary md:px-6">
                                                                  #{row.storageSpaceId}
                                                              </td>
                                                              <td className="whitespace-nowrap px-4 py-3 md:px-6">
                                                                  <span className={quantityClass(kind)}>
                                                                      {row.quantity} UN
                                                                  </span>
                                                              </td>
                                                              <td className="max-w-xs px-4 py-3 text-text-secondary md:px-6">
                                                                  <span className="line-clamp-2">
                                                                      {row.note?.trim() || "—"}
                                                                  </span>
                                                              </td>
                                                          </tr>
                                                      );
                                                  })
                                            : null}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                </>
            ) : activeSource === "history" ? (
                <>
                    <Card>
                        <CardBody className="space-y-4">
                            {showKardex && activeSource === "history" ? (
                                <Alert variant="warning" className="rounded-xl text-sm">
                                    <strong>Ejemplo (sin datos reales).</strong> La tabla siguiente usa movimientos
                                    ilustrativos; cambia a{" "}
                                    <strong>{appEnv.isDevelopment ? "Kardex (API)" : "Kardex"}</strong> para consultar
                                    el movimiento detallado por producto.
                                </Alert>
                            ) : null}
                    {dateOrderInvalid ? (
                        <p className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong">
                            La fecha hasta no puede ser anterior a la fecha desde.
                        </p>
                    ) : null}
                    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                        <div className="min-w-[10rem] flex-1">
                            <Label htmlFor={`${formId}-from`}>Fecha desde</Label>
                            <input
                                id={`${formId}-from`}
                                type="date"
                                value={draftFrom}
                                onChange={(e) => setDraftFrom(e.target.value)}
                                className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                            />
                        </div>
                        <div className="min-w-[10rem] flex-1">
                            <Label htmlFor={`${formId}-to`}>Fecha hasta</Label>
                            <input
                                id={`${formId}-to`}
                                type="date"
                                value={draftTo}
                                onChange={(e) => setDraftTo(e.target.value)}
                                className="mt-1.5 block h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-default/20"
                            />
                        </div>
                        <div className="w-full min-w-[10rem] lg:w-44">
                            <Select
                                label="Tipo"
                                options={[...TYPE_FILTER_OPTIONS]}
                                value={draftType}
                                onChange={(e) => setDraftType(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0">
                            <Button
                                type="button"
                                variant="primary"
                                className="min-w-[7.5rem]"
                                leftIcon={<MagnifyingGlassMini className="h-4 w-4" />}
                                onClick={handleSearch}
                                disabled={dateOrderInvalid}
                            >
                                Buscar
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-[7.5rem]"
                                leftIcon={<ArrowPathMini className="h-4 w-4" />}
                                onClick={handleClear}
                            >
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardBody padding="none">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle bg-surface-sunken/50">
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Fecha
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Tipo
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Subtipo
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Producto
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Cantidad
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Usuario
                                    </th>
                                    <th className="min-w-[12rem] px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Observación
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                                            No hay movimientos en el rango seleccionado.
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((row) => (
                                        <tr key={row.id} className="bg-surface-base hover:bg-surface-sunken/30">
                                            <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                {formatDateTime(row.at)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 md:px-6">{typeBadge(row.type)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-text-primary md:px-6">
                                                {row.subtype}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-text-primary md:px-6">
                                                {row.product}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 md:px-6">
                                                <span className={quantityClass(row.type)}>
                                                    {row.quantity} UN
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                {row.userLabel}
                                            </td>
                                            <td className="max-w-xs px-4 py-3 text-text-secondary md:max-w-md md:px-6">
                                                <span className="line-clamp-2 md:line-clamp-none">{row.observation}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
                        <p className="text-sm text-text-tertiary">
                            Mostrando{" "}
                            <span className="font-medium text-text-secondary">{startRecord}</span> a{" "}
                            <span className="font-medium text-text-secondary">{endRecord}</span> de{" "}
                            <span className="font-medium text-text-secondary">{filtered.length}</span>{" "}
                            registros
                        </p>
                        <div className="flex items-center justify-center gap-2 sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="px-2"
                                disabled={effectivePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPage(p)}
                                        className={[
                                            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                                            p === effectivePage
                                                ? "bg-brand-strong text-text-onbrand shadow-sm"
                                                : "text-text-secondary hover:bg-surface-hover",
                                        ].join(" ")}
                                        aria-current={p === effectivePage ? "page" : undefined}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="px-2"
                                disabled={effectivePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                aria-label="Página siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>
                </>
            ) : null}
        </div>
    );
}

function MagnifyingGlassMini({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
    );
}

function ArrowPathMini({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    );
}

function ChevronLeft({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
    );
}
