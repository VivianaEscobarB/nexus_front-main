"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { appEnv } from "@/lib/config/env";
import { listInventory } from "@/modules/supervisor/api/supervisorWarehouseApi";
import type { JsonRecord } from "@/modules/supervisor/api/supervisorWarehouseTypes";
import { pickFirstString, stableRowId } from "@/modules/supervisor/api/supervisorWarehouseDisplay";
import { StorageSpaceLocationPicker } from "@/modules/warehouse/components/StorageSpaceLocationPicker";
import { isApiError } from "@/shared/api/apiError";

type RowStatus = "disponible" | "stock_bajo" | "agotado";

type InventoryRow = {
    id: string;
    product: string;
    batch: string;
    warehouseLabel: string;
    sectorSlot: string;
    quantity: number;
    expiry: string | null;
    status: RowStatus;
};

const PAGE_SIZE = 8;

const INVENTORY_403_HINT_USER =
    "Tu usuario no tiene permiso para esta consulta o el servidor restringe el acceso. Si deberías ver inventario, pide revisión al administrador.";

const INVENTORY_403_HINT_DEV =
    "Solo desarrollo: revisa SecurityFilterChain y @PreAuthorize — GET /api/inventory debe permitir OPERATOR y SUPERVISOR; POST/PATCH bajo /api/inventory/** suelen ser solo OPERATOR.";

function inferStatus(qty: number, rawStatus: string | null): RowStatus {
    const s = (rawStatus ?? "").toLowerCase();
    if (s.includes("agot") || s === "out") return "agotado";
    if (s.includes("baj") || s.includes("low")) return "stock_bajo";
    if (qty <= 0) return "agotado";
    if (qty < 10) return "stock_bajo";
    return "disponible";
}

function mapRecordToRow(raw: JsonRecord, index: number): InventoryRow {
    const product =
        pickFirstString(raw, [
            "productName",
            "product",
            "description",
            "name",
            "sku",
            "productCode",
        ]) ?? "—";
    const batch =
        pickFirstString(raw, ["lotCode", "batch", "lot", "batchCode"]) ?? "—";
    const warehouseLabel =
        pickFirstString(raw, [
            "warehouseName",
            "warehouse",
            "warehouseCode",
            "site",
        ]) ?? "—";
    const sectorSlot =
        pickFirstString(raw, [
            "sectorSlot",
            "locationLabel",
            "storageSpaceLabel",
            "position",
            "sector",
            "storageSpaceId",
            "storageSpaceCode",
        ]) ?? "—";

    const qtyRaw =
        raw.quantity ?? raw.availableQuantity ?? raw.stock ?? raw.balance ?? raw.onHand;
    const quantity =
        typeof qtyRaw === "number" && Number.isFinite(qtyRaw)
            ? qtyRaw
            : typeof qtyRaw === "string" && qtyRaw.trim()
              ? Number(qtyRaw)
              : 0;

    const expiryRaw = pickFirstString(raw, [
        "expiryDate",
        "expirationDate",
        "expiresAt",
        "bestBefore",
    ]);
    let expiry: string | null = null;
    if (expiryRaw) {
        const day = expiryRaw.slice(0, 10);
        expiry = day.length === 10 ? day : null;
    }

    const status = inferStatus(
        quantity,
        pickFirstString(raw, ["status", "stockStatus", "availability"])
    );

    return {
        id: stableRowId(raw, index),
        product,
        batch,
        warehouseLabel,
        sectorSlot,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        expiry,
        status,
    };
}

function formatExpiry(iso: string | null): string {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "—";
    return `${d}/${m}/${y}`;
}

function statusBadge(status: RowStatus) {
    switch (status) {
        case "disponible":
            return <Badge variant="success" label="Disponible" size="sm" />;
        case "stock_bajo":
            return <Badge variant="warning" label="Stock bajo" size="sm" />;
        case "agotado":
            return <Badge variant="danger" label="Agotado" size="sm" />;
        default:
            return <Badge variant="neutral" label="—" size="sm" />;
    }
}

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible consultar el inventario.";
}

export function InventoryQueryView() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto max-w-7xl pb-10">
                    <p className="text-sm text-text-tertiary">Cargando consulta de inventario…</p>
                </div>
            }
        >
            <InventoryQueryViewImpl />
        </Suspense>
    );
}

function InventoryQueryViewImpl() {
    const searchParams = useSearchParams();

    const [draftProductId, setDraftProductId] = useState("");
    const [draftStorageSpaceId, setDraftStorageSpaceId] = useState("");
    const [storagePickerKey, setStoragePickerKey] = useState(0);
    const [localFilter, setLocalFilter] = useState("");
    const [fromLinkHint, setFromLinkHint] = useState(false);

    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const pid = searchParams.get("productId")?.trim() ?? "";
        const sid = searchParams.get("storageSpaceId")?.trim() ?? "";
        if (pid) {
            setDraftProductId(pid);
        }
        if (sid) {
            setDraftStorageSpaceId(sid);
        }
        setFromLinkHint(Boolean(pid || sid));
    }, [searchParams]);

    const filtered = useMemo(() => {
        const q = localFilter.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => {
            const hay = `${row.product} ${row.batch} ${row.warehouseLabel} ${row.sectorSlot}`.toLowerCase();
            return hay.includes(q);
        });
    }, [rows, localFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const effectivePage = Math.min(page, totalPages);
    const startIdx = (effectivePage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    const startRecord = filtered.length === 0 ? 0 : startIdx + 1;
    const endRecord = startIdx + pageRows.length;

    async function handleSearch() {
        setIsLoading(true);
        setError(null);
        setForbidden(false);
        setPage(1);
        try {
            const rawList = await listInventory({
                productId: draftProductId.trim() || undefined,
                storageSpaceId: draftStorageSpaceId.trim() || undefined,
            });
            setRows(rawList.map((r, i) => mapRecordToRow(r, i)));
        } catch (e) {
            setRows([]);
            setError(getErrorMessage(e));
            if (isApiError(e) && e.status === 403) {
                setForbidden(true);
            }
        } finally {
            setIsLoading(false);
        }
    }

    function handleClear() {
        setDraftProductId("");
        setDraftStorageSpaceId("");
        setStoragePickerKey((k) => k + 1);
        setLocalFilter("");
        setFromLinkHint(false);
        setRows([]);
        setError(null);
        setForbidden(false);
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-10">
            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Consulta de inventario
                </h2>
                <p className="text-sm text-text-secondary">
                    Consulta existencias por producto y espacio de almacenamiento.
                    {appEnv.isDevelopment ? (
                        <>
                            {" "}
                            <span className="font-mono text-xs text-text-tertiary">
                                GET /api/inventory
                            </span>{" "}
                            (<code className="text-xs">productId</code>,{" "}
                            <code className="text-xs">storageSpaceId</code>).
                        </>
                    ) : null}
                </p>
            </header>

            {fromLinkHint ? (
                <Alert variant="warning" className="rounded-xl text-sm">
                    Filtros cargados desde un enlace (por ejemplo, desde una alerta). Pulsa{" "}
                    <strong>Consultar inventario</strong> para ejecutar la búsqueda.
                </Alert>
            ) : null}

            <Card>
                <CardBody className="space-y-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end">
                        <div className="min-w-[12rem] flex-1">
                            <Input
                                label="ID producto (opcional)"
                                placeholder="UUID o código interno"
                                value={draftProductId}
                                onChange={(e) => setDraftProductId(e.target.value)}
                            />
                        </div>
                        <div className="min-w-[12rem] flex-[1_1_20rem]">
                            <StorageSpaceLocationPicker
                                key={storagePickerKey}
                                value={draftStorageSpaceId}
                                onChange={setDraftStorageSpaceId}
                                label="Espacio de almacenamiento (opcional)"
                            />
                        </div>
                        <div className="min-w-[12rem] flex-1">
                            <Input
                                label="Filtrar resultados (local)"
                                placeholder="Texto en producto, lote, bodega…"
                                value={localFilter}
                                onChange={(e) => setLocalFilter(e.target.value)}
                                leadingIcon={<MagnifyingGlassMini className="h-5 w-5 text-text-tertiary" />}
                            />
                        </div>
                        <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:shrink-0">
                            <Button
                                type="button"
                                variant="primary"
                                className="min-w-[7.5rem]"
                                leftIcon={<MagnifyingGlassMini className="h-4 w-4" />}
                                onClick={() => void handleSearch()}
                                disabled={isLoading}
                            >
                                {isLoading ? "Consultando…" : "Consultar inventario"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-[7.5rem]"
                                leftIcon={<ArrowPathMini className="h-4 w-4" />}
                                onClick={handleClear}
                                disabled={isLoading}
                            >
                                Limpiar
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-text-tertiary">
                        Deja ambos IDs vacíos solo si el backend permite listar todo el inventario; si no, indica al
                        menos uno.
                    </p>
                </CardBody>
            </Card>

            {error ? (
                <div className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong space-y-1">
                    <p>{error}</p>
                    {forbidden ? (
                        <>
                            <p className="text-xs opacity-90">{INVENTORY_403_HINT_USER}</p>
                            {appEnv.isDevelopment ? (
                                <p className="text-xs opacity-90">{INVENTORY_403_HINT_DEV}</p>
                            ) : null}
                        </>
                    ) : null}
                </div>
            ) : null}

            <Card>
                <CardBody padding="none">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle bg-surface-sunken/50">
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Producto
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Lote
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Bodega
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Ubicación
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Disponible
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Vencimiento
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-secondary md:px-6">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                                            {rows.length === 0 && !isLoading
                                                ? "Consulta el API para ver filas. Aún no hay datos cargados."
                                                : "No hay registros que coincidan con el filtro local."}
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((row) => (
                                        <tr key={row.id} className="bg-surface-base hover:bg-surface-sunken/30">
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary md:px-6">
                                                {row.product}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary md:px-6">
                                                {row.batch}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                {row.warehouseLabel}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                {row.sectorSlot}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 md:px-6">
                                                <span className="font-bold tabular-nums text-success-text">
                                                    {row.quantity} UN
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-text-secondary md:px-6">
                                                {formatExpiry(row.expiry)}
                                            </td>
                                            <td className="px-4 py-3 md:px-6">{statusBadge(row.status)}</td>
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
                            <span className="font-medium text-text-secondary">{filtered.length}</span> registros
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
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-strong text-sm font-semibold text-text-onbrand shadow-sm"
                                aria-current="page"
                            >
                                {effectivePage}
                            </span>
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
