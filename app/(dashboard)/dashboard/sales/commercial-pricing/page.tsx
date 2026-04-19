"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Input, Label, Modal, Select } from "@/components/ui";
import { Badge } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import {
    listRentalUnitsPricing,
    patchRentalUnitPricing,
} from "@/modules/sales";
import type { RentalUnitPricingRow, UpdateRentalUnitPricingInput } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

const CURRENCY_REGEX = /^[A-Z]{3}$/;

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
    const isAdmin = useMemo(
        () => user?.roles?.some((r) => r.role_name === UserRole.ADMIN) ?? false,
        [user?.roles]
    );

    const [rows, setRows] = useState<RentalUnitPricingRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    const [readyOnly, setReadyOnly] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

    const [modalRow, setModalRow] = useState<RentalUnitPricingRow | null>(null);
    const [formBasePrice, setFormBasePrice] = useState("");
    const [formCurrency, setFormCurrency] = useState("");
    const [formPriceActive, setFormPriceActive] = useState(true);
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [isPatching, setIsPatching] = useState(false);

    const [flash, setFlash] = useState<Flash>(null);

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
        if (!flash) return;
        const t = window.setTimeout(() => setFlash(null), 6000);
        return () => window.clearTimeout(t);
    }, [flash]);

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

    const emptyMessage =
        readyOnly || activeFilter !== "all"
            ? "No hay unidades que coincidan con los filtros. Prueba ampliar la búsqueda."
            : "No hay unidades de arrendamiento registradas para parametrizar.";

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.SALES_AGENT]}>
                <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
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

                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                                Parametrización comercial
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                Define precio base, moneda y activación comercial de cada unidad de arrendamiento.
                            </p>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                                Las filas corresponden a <strong>rental units</strong> creadas desde la infraestructura de bodegas y la sincronización del catálogo, no desde un formulario comercial aislado. Si faltan unidades, cree bodegas en{" "}
                                <Link href="/dashboard/infrastructure" className="font-semibold text-[var(--color-brand-strong)] underline">
                                    Infraestructura
                                </Link>
                                {isAdmin ? (
                                    <>
                                        {" "}
                                        o ejecute{" "}
                                        <Link href="/dashboard/sales/commercial-sync" className="font-semibold text-[var(--color-brand-strong)] underline">
                                            Resincronizar catálogo
                                        </Link>
                                        .
                                    </>
                                ) : (
                                    <> Un administrador puede ejecutar la resincronización masiva del catálogo si aplica.</>
                                )}
                            </p>
                        </div>
                    </div>

                    {!isAdmin ? (
                        <div
                            role="note"
                            className="rounded-lg border border-[var(--color-info-default)]/40 bg-[var(--color-info-subtle)] px-4 py-3 text-sm text-[var(--color-info-strong)]"
                        >
                            Tu rol permite solo consultar esta información. La edición de precios está reservada
                            a administradores.
                        </div>
                    ) : null}

                    {pageError ? (
                        <div
                            role="alert"
                            className="flex items-center justify-between rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]"
                        >
                            <span>{pageError}</span>
                            <Button variant="ghost" size="sm" onClick={() => void fetchRows()}>
                                Reintentar
                            </Button>
                        </div>
                    ) : null}

                    <Card>
                        <CardBody className="p-0">
                            <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[var(--color-border-subtle)]"
                                        checked={readyOnly}
                                        onChange={(e) => setReadyOnly(e.target.checked)}
                                    />
                                    Solo listas para comercializar
                                </label>
                                <div className="w-full min-w-[200px] max-w-xs sm:w-64">
                                    <Label size="sm" className="mb-1 block text-[var(--color-text-secondary)]">
                                        Estado comercial
                                    </Label>
                                    <Select
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
                                            : rows.length === 0
                                              ? (
                                                    <tr>
                                                        <td
                                                            colSpan={7}
                                                            className="px-6 py-10 text-center text-[var(--color-text-tertiary)]"
                                                        >
                                                            {emptyMessage}
                                                        </td>
                                                    </tr>
                                                )
                                              : rows.map((row) => (
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
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openModal(row)}
                                                                >
                                                                    Configurar precio
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled
                                                                    title="Solo lectura"
                                                                >
                                                                    Solo lectura
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                    </tbody>
                                </table>
                            </div>
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
                                    <ul
                                        role="alert"
                                        className="list-inside list-disc rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-3 py-2 text-sm text-[var(--color-danger-strong)]"
                                    >
                                        {formErrors.map((e) => (
                                            <li key={e}>{e}</li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        ) : null}
                    </Modal>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
