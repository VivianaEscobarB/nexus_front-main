"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody, Input, Label, Modal, Pagination, Select } from "@/components/ui";
import { usePagination } from "@/shared/hooks/usePagination";
import { Badge } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import {
    listRentalUnitsPricing,
    patchRentalUnitPricing,
    syncRentalUnitsCatalog,
} from "@/modules/sales";
import type { RentalUnitPricingRow, UpdateRentalUnitPricingInput } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

const CURRENCY_REGEX = /^[A-Z]{3}$/;
const PRICING_PAGE_SIZE = 8;

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "Ocurrió un error inesperado.";
}

function formatMutationError(error: unknown): string {
    const msg = getApiErrorMessage(error);
    if (!isApiError(error)) return msg;
    switch (error.status) {
        case 400:
            return `Solicitud no válida: ${msg}`;
        case 403:
            return `No autorizado: ${msg}`;
        case 404:
            return `No encontrado: ${msg}`;
        case 409:
            return `Conflicto: ${msg}`;
        default:
            return msg;
    }
}

function formatUnitLabel(row: RentalUnitPricingRow): string {
    const parts = [
        row.referenceType?.trim(),
        row.referenceCode?.trim(),
        row.referenceName?.trim(),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : `Unidad #${row.rentalUnitId}`;
}

function formatMoney(amount: number, currency: string): string {
    const cur = currency?.trim() || "COP";
    try {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: cur.length === 3 ? cur : "COP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${amount.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
    }
}

function formatUpdatedCell(row: RentalUnitPricingRow): string {
    const when = row.priceUpdatedAt?.trim();
    const who = row.priceUpdatedBy?.trim();
    if (!when && !who) return "—";
    let datePart = when ?? "";
    if (when) {
        const d = new Date(when);
        if (!Number.isNaN(d.getTime())) {
            datePart = new Intl.DateTimeFormat("es-CO", {
                dateStyle: "short",
                timeStyle: "short",
            }).format(d);
        }
    }
    if (who) return `${datePart}${datePart ? " · " : ""}${who}`;
    return datePart || "—";
}

type Flash = { kind: "success" | "error"; text: string } | null;

export default function CommercialPricingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isAdmin = useMemo(
        () => user?.roles?.some((r) => r.role_name === UserRole.ADMIN) ?? false,
        [user?.roles]
    );

    const [rows, setRows] = useState<RentalUnitPricingRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    const [readyOnly, setReadyOnly] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [modalRow, setModalRow] = useState<RentalUnitPricingRow | null>(null);
    const [formBasePrice, setFormBasePrice] = useState("");
    const [formCurrency, setFormCurrency] = useState("");
    const [formPriceActive, setFormPriceActive] = useState(true);
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [isPatching, setIsPatching] = useState(false);

    const [flash, setFlash] = useState<Flash>(null);
    const [isSyncedFromUrl, setIsSyncedFromUrl] = useState(false);
    const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
    const [syncCatalogMessage, setSyncCatalogMessage] = useState<string | null>(null);
    const [syncCatalogError, setSyncCatalogError] = useState<string | null>(null);

    const fetchRows = useCallback(async () => {
        setIsLoading(true);
        setPageError(null);
        try {
            const data = await listRentalUnitsPricing({
                readyOnly: readyOnly ? true : undefined,
                activeOnly:
                    activeFilter === "all"
                        ? undefined
                        : activeFilter === "active"
                          ? true
                          : false,
            });
            setRows(data);
        } catch (err) {
            setPageError(getApiErrorMessage(err));
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [readyOnly, activeFilter]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        const q = searchParams.get("q") ?? "";
        const status = searchParams.get("status");
        const ready = searchParams.get("ready");
        setSearchInput(q);
        setReadyOnly(ready === "1");
        if (status === "active" || status === "inactive") {
            setActiveFilter(status);
        } else {
            setActiveFilter("all");
        }
        setIsSyncedFromUrl(true);
    }, [searchParams]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchTerm(searchInput.trim());
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (!isSyncedFromUrl) return;
        const params = new URLSearchParams();
        const q = searchInput.trim();
        if (q) params.set("q", q);
        if (activeFilter !== "all") params.set("status", activeFilter);
        if (readyOnly) params.set("ready", "1");
        const nextQuery = params.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [activeFilter, isSyncedFromUrl, pathname, readyOnly, router, searchInput]);

    useEffect(() => {
        if (!flash) return;
        const t = window.setTimeout(() => setFlash(null), 6000);
        return () => window.clearTimeout(t);
    }, [flash]);

    const filteredRows = useMemo(() => {
        const query = searchTerm.toLowerCase();
        if (!query) return rows;
        return rows.filter((row) => {
            const haystack = [
                formatUnitLabel(row),
                String(row.rentalUnitId),
                row.entityTypeName ?? "",
                row.referenceCode ?? "",
                row.referenceName ?? "",
                row.referenceType ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [rows, searchTerm]);

    const {
        paginatedData: paginatedRows,
        currentPage: tablePage,
        totalPages: tableTotalPages,
        goToPage: goToTablePage,
        totalItems: filteredTotalItems,
    } = usePagination(filteredRows, PRICING_PAGE_SIZE);

    const rangeLabel = useMemo(() => {
        if (filteredTotalItems === 0) return null;
        const start = (tablePage - 1) * PRICING_PAGE_SIZE + 1;
        const end = Math.min(tablePage * PRICING_PAGE_SIZE, filteredTotalItems);
        return `Mostrando ${start}–${end} de ${filteredTotalItems}`;
    }, [filteredTotalItems, tablePage]);

    const openModal = (row: RentalUnitPricingRow) => {
        setModalRow(row);
        setFormBasePrice(String(row.basePrice ?? 0));
        setFormCurrency((row.currency ?? "COP").toUpperCase());
        setFormPriceActive(row.priceActive);
        setFormErrors([]);
    };

    const closeModal = () => {
        setModalRow(null);
        setFormErrors([]);
    };

    const validateForm = (): UpdateRentalUnitPricingInput | null => {
        const errs: string[] = [];
        const n = Number(formBasePrice.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) {
            errs.push("El precio base debe ser un número mayor o igual a 0.");
        }
        const cur = formCurrency.trim().toUpperCase();
        if (!CURRENCY_REGEX.test(cur)) {
            errs.push("La moneda debe ser exactamente 3 letras mayúsculas (ISO 4217, ej. COP).");
        }
        setFormErrors(errs);
        if (errs.length > 0) return null;
        return { basePrice: n, currency: cur, priceActive: formPriceActive };
    };

    const handleSubmitPricing = async () => {
        if (!modalRow || !isAdmin) return;
        const input = validateForm();
        if (!input) return;
        setIsPatching(true);
        try {
            await patchRentalUnitPricing(modalRow.rentalUnitId, input);
            setFlash({ kind: "success", text: "Precio actualizado correctamente." });
            closeModal();
            await fetchRows();
        } catch (err) {
            setFlash({ kind: "error", text: formatMutationError(err) });
        } finally {
            setIsPatching(false);
        }
    };

    const hasActiveFilters = readyOnly || activeFilter !== "all" || searchTerm.length > 0;
    const emptyMessage = hasActiveFilters
        ? "No hay resultados con los filtros actuales."
        : "No hay unidades de arrendamiento registradas para parametrizar.";

    const handleClearFilters = () => {
        setSearchInput("");
        setReadyOnly(false);
        setActiveFilter("all");
    };

    const handleSyncCatalog = async () => {
        if (!isAdmin || isSyncingCatalog) return;
        setIsSyncingCatalog(true);
        setSyncCatalogError(null);
        setSyncCatalogMessage(null);
        try {
            const detail = await syncRentalUnitsCatalog();
            setSyncCatalogMessage(
                detail ??
                    "Catálogo alineado con infraestructura. El listado de precios se actualizó automáticamente."
            );
            await fetchRows();
        } catch (err) {
            setSyncCatalogError(formatMutationError(err));
        } finally {
            setIsSyncingCatalog(false);
        }
    };

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.SALES_AGENT]}>
                <div className="mx-auto max-w-7xl space-y-4 md:space-y-5 animate-in fade-in duration-500">
                    <div className="md:hidden">
                        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Parametrización comercial
                        </h1>
                        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                            Precio base, moneda y activación comercial por unidad.
                        </p>
                    </div>

                    {flash ? (
                        <div
                            role="status"
                            className={`fixed right-4 top-20 z-[60] max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${
                                flash.kind === "success"
                                    ? "border-[var(--color-success-default)] bg-[var(--color-success-subtle)] text-[var(--color-success-strong)]"
                                    : "border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)]"
                            }`}
                        >
                            {flash.text}
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-4 sm:flex-row sm:items-start sm:justify-between">
                        <p className="max-w-3xl text-sm leading-snug text-[var(--color-text-secondary)]">
                            {isAdmin ? (
                                <>
                                    Gestiona precios y activación comercial de las unidades del catálogo. La estructura
                                    física está en{" "}
                                    <Link href="/dashboard/infrastructure" className="font-semibold text-[var(--color-brand-strong)] underline">
                                        Infraestructura
                                    </Link>
                                    . Si tras cambios allí no ves filas aquí, usa{" "}
                                    <strong className="text-[var(--color-text-primary)]">Sincronizar con infraestructura</strong>{" "}
                                    y, si hace falta,{" "}
                                    <strong className="text-[var(--color-text-primary)]">Recargar listado</strong>.
                                </>
                            ) : (
                                <>
                                    Consulta precios y estado comercial del catálogo. Para el detalle operativo
                                    (ubicación, disponibilidad), abre{" "}
                                    <Link href="/dashboard/sales/rental-units" className="font-semibold text-[var(--color-brand-strong)] underline">
                                        Unidades de arrendamiento
                                    </Link>
                                    .
                                </>
                            )}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {isAdmin ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleSyncCatalog()}
                                    disabled={isSyncingCatalog || isLoading}
                                    isLoading={isSyncingCatalog}
                                >
                                    Sincronizar con infraestructura
                                </Button>
                            ) : null}
                            <Button variant="secondary" size="sm" onClick={() => void fetchRows()} disabled={isLoading}>
                                Recargar listado
                            </Button>
                        </div>
                    </div>

                    {syncCatalogError ? (
                        <Alert variant="danger" className="rounded-lg">
                            {syncCatalogError}
                        </Alert>
                    ) : null}
                    {syncCatalogMessage ? (
                        <Alert variant="success" role="status" className="rounded-lg">
                            {syncCatalogMessage}
                        </Alert>
                    ) : null}

                    {!isAdmin ? (
                        <Alert variant="info" role="note" className="rounded-lg">
                            Tu rol permite solo consultar esta información. La edición de precios está reservada
                            a administradores.
                        </Alert>
                    ) : null}

                    {pageError ? (
                        <Alert variant="danger" className="flex items-center justify-between rounded-lg">
                            <span>{pageError}</span>
                            <Button variant="ghost" size="sm" onClick={() => void fetchRows()}>
                                Reintentar
                            </Button>
                        </Alert>
                    ) : null}

                    <Card>
                        <CardBody className="p-0">
                            <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                                    <div className="min-w-0 flex-1 md:min-w-[280px]">
                                        <Input
                                            label="Buscar"
                                            placeholder="Buscar por unidad, código o tipo"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full md:w-56">
                                        <Select
                                            label="Estado comercial"
                                            value={activeFilter}
                                            onChange={(e) =>
                                                setActiveFilter(e.target.value as "all" | "active" | "inactive")
                                            }
                                            options={[
                                                { value: "all", label: "Todas" },
                                                { value: "active", label: "Solo activas" },
                                                { value: "inactive", label: "Solo inactivas" },
                                            ]}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 md:ml-auto">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-[var(--color-border-subtle)]"
                                                checked={readyOnly}
                                                onChange={(e) => setReadyOnly(e.target.checked)}
                                            />
                                            Solo listas para comercializar
                                        </label>
                                        <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                            Limpiar filtros
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">Unidad</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">
                                                Tipo entidad
                                            </th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">
                                                Precio base
                                            </th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">Moneda</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">
                                                Estado comercial
                                            </th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase">
                                                Última actualización
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                        {isLoading
                                            ? [...Array(5)].map((_, i) => (
                                                  <tr key={i}>
                                                      {[...Array(7)].map((_, j) => (
                                                          <td key={j} className="px-6 py-4">
                                                              <div className="h-4 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                                          </td>
                                                      ))}
                                                  </tr>
                                              ))
                                            : filteredRows.length === 0
                                              ? (
                                                    <tr>
                                                        <td
                                                            colSpan={7}
                                                            className="px-6 py-10 text-center text-[var(--color-text-tertiary)]"
                                                        >
                                                            <div className="space-y-3">
                                                                <p>{emptyMessage}</p>
                                                                {hasActiveFilters ? (
                                                                    <div className="flex justify-center">
                                                                        <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                                                            Limpiar filtros
                                                                        </Button>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                              : paginatedRows.map((row) => (
                                                    <tr
                                                        key={row.rentalUnitId}
                                                        className="transition-colors hover:bg-[var(--color-surface-hover)]"
                                                    >
                                                        <td className="max-w-xs px-6 py-4 align-top text-[var(--color-text-primary)]">
                                                            <div className="whitespace-normal font-medium">
                                                                {formatUnitLabel(row)}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                                                                ID unidad: {row.rentalUnitId}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-[var(--color-text-secondary)]">
                                                            {row.entityTypeName || "—"}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 font-medium tabular-nums">
                                                            {formatMoney(row.basePrice, row.currency)}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">
                                                            {row.currency || "—"}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge
                                                                variant={row.priceActive ? "success" : "neutral"}
                                                                label={row.priceActive ? "Activa" : "Inactiva"}
                                                            />
                                                        </td>
                                                        <td className="max-w-[14rem] whitespace-normal px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                                                            {formatUpdatedCell(row)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {isAdmin ? (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => openModal(row)}
                                                                >
                                                                    Configurar precio
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                                                    Solo lectura
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                    </tbody>
                                </table>
                            </div>
                            {!isLoading && filteredRows.length > 0 ? (
                                <div className="border-t border-[var(--color-border-subtle)] px-4 py-2">
                                    {rangeLabel ? (
                                        <p className="mb-1 text-center text-xs text-[var(--color-text-tertiary)]">
                                            {rangeLabel}
                                        </p>
                                    ) : null}
                                    <Pagination
                                        currentPage={tablePage}
                                        totalPages={tableTotalPages}
                                        onPageChange={goToTablePage}
                                        className="py-2"
                                    />
                                </div>
                            ) : null}
                        </CardBody>
                    </Card>

                    <Modal
                        isOpen={modalRow != null}
                        onClose={() => {
                            if (!isPatching) closeModal();
                        }}
                        closeOnBackdrop={!isPatching}
                        title="Configurar precio"
                        description={
                            modalRow
                                ? `Unidad: ${formatUnitLabel(modalRow)}`
                                : undefined
                        }
                        size="md"
                        footer={
                            <div className="flex w-full justify-end gap-2">
                                <Button variant="ghost" onClick={closeModal} disabled={isPatching}>
                                    Cancelar
                                </Button>
                                <Button variant="primary" onClick={() => void handleSubmitPricing()} disabled={isPatching}>
                                    {isPatching ? "Guardando…" : "Guardar"}
                                </Button>
                            </div>
                        }
                    >
                        {modalRow ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                                    <p>
                                        <span className="font-semibold text-[var(--color-text-primary)]">
                                            Última actualización:
                                        </span>{" "}
                                        {formatUpdatedCell(modalRow)}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="cp-basePrice">Precio base</Label>
                                    <Input
                                        id="cp-basePrice"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={formBasePrice}
                                        onChange={(e) => setFormBasePrice(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="cp-currency">Moneda (3 letras)</Label>
                                    <Input
                                        id="cp-currency"
                                        value={formCurrency}
                                        onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                                        maxLength={3}
                                        className="mt-1 font-mono uppercase"
                                        placeholder="COP"
                                    />
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[var(--color-border-subtle)]"
                                        checked={formPriceActive}
                                        onChange={(e) => setFormPriceActive(e.target.checked)}
                                    />
                                    Precio activo en catálogo comercial
                                </label>

                                {formErrors.length > 0 ? (
                                    <Alert variant="danger" className="rounded-lg py-2">
                                        <ul className="mb-0 list-inside list-disc space-y-0.5 pl-0.5">
                                            {formErrors.map((e) => (
                                                <li key={e}>{e}</li>
                                            ))}
                                        </ul>
                                    </Alert>
                                ) : null}
                            </div>
                        ) : null}
                    </Modal>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
