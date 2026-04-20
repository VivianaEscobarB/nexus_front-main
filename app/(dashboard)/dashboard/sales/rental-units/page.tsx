"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Input, Label } from "@/components/ui";
import { Badge } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { listRentalUnits } from "@/modules/sales";
import type { RentalUnit } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar las unidades.";
}

function unitTitle(u: RentalUnit): string {
    if (u.displaySummary?.trim()) return u.displaySummary.trim();
    if (u.warehouse?.name) return u.warehouse.name;
    if (u.sector?.code) return `Sector ${u.sector.code}`;
    if (u.storageSpace?.code) return `Espacio ${u.storageSpace.code}`;
    return `Unidad #${u.id}`;
}

export default function RentalUnitsListPage() {
    const { user } = useAuth();
    const isAdmin = user?.roles?.some((r) => r.role_name === UserRole.ADMIN) ?? false;

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [units, setUnits] = useState<RentalUnit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUnits = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await listRentalUnits({
                startDate: startDate.trim() || undefined,
                endDate: endDate.trim() || undefined,
            });
            setUnits(data);
        } catch (err) {
            setError(getApiErrorMessage(err));
            setUnits([]);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        void fetchUnits();
    }, [fetchUnits]);

    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.SALES_AGENT]}>
                <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Unidades de arrendamiento
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                            Listado técnico de <strong>rental units</strong> expuestas por{" "}
                            <code className="rounded bg-[var(--color-surface-hover)] px-1 text-xs">GET /api/sales/rental-units</code>.
                            Estas filas enlazan bodega / sector / espacio según el tipo de entidad. Se originan desde la
                            infraestructura de bodegas y la sincronización del catálogo, no desde un formulario comercial
                            aislado.
                        </p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-info-default)]/35 bg-[var(--color-info-subtle)] p-4 text-sm text-[var(--color-info-strong)]">
                        <p>
                            ¿Lista vacía? Cree una bodega (o sectores/espacios según su modelo) en{" "}
                            <Link href="/dashboard/infrastructure" className="font-semibold underline">
                                Infraestructura
                            </Link>{" "}
                            y espere unos segundos a la sincronización.
                            {isAdmin ? (
                                <>
                                    {" "}
                                    Si hubo datos previos a eventos en vivo, ejecute{" "}
                                    <Link href="/dashboard/sales/commercial-sync" className="font-semibold underline">
                                        Resincronizar catálogo
                                    </Link>
                                    .
                                </>
                            ) : null}
                        </p>
                        <p className="mt-2">
                            Si al crear un contrato el backend responde conflicto por precio inactivo o no configurado, un
                            administrador debe ajustar{" "}
                            <Link href="/dashboard/sales/commercial-pricing" className="font-semibold underline">
                                Parametrización comercial
                            </Link>
                            .
                        </p>
                    </div>

                    {error ? (
                        <div
                            role="alert"
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]"
                        >
                            <span>{error}</span>
                            <Button variant="ghost" size="sm" onClick={() => void fetchUnits()}>
                                Reintentar
                            </Button>
                        </div>
                    ) : null}

                    <Card>
                        <CardBody className="space-y-4 p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="min-w-[160px]">
                                    <Label htmlFor="ru-start" size="sm" className="mb-1 block">
                                        Desde (ISO fecha)
                                    </Label>
                                    <Input
                                        id="ru-start"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="min-w-[160px]">
                                    <Label htmlFor="ru-end" size="sm" className="mb-1 block">
                                        Hasta (ISO fecha)
                                    </Label>
                                    <Input id="ru-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                                <Button variant="primary" type="button" onClick={() => void fetchUnits()} disabled={isLoading}>
                                    Aplicar rango
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    disabled={isLoading}
                                >
                                    Limpiar fechas
                                </Button>
                            </div>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                Con rango de fechas, el backend puede incluir{" "}
                                <code className="rounded bg-[var(--color-surface-hover)] px-1">availabilityStatus</code> por
                                unidad.
                            </p>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">ID</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Unidad</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Tipo entidad</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Bodega</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Sector</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Espacio</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Disponibilidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                        {isLoading ? (
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i}>
                                                    {[...Array(7)].map((_, j) => (
                                                        <td key={j} className="px-4 py-3">
                                                            <div className="h-4 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : units.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                                                    <p className="font-medium text-[var(--color-text-primary)]">
                                                        No hay unidades de arrendamiento para mostrar.
                                                    </p>
                                                    <p className="mx-auto mt-2 max-w-lg text-sm">
                                                        Cree una bodega en Infraestructura y espere la sincronización, o
                                                        solicite a un administrador la resincronización masiva del catálogo.
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            units.map((u) => (
                                                <tr key={u.id} className="hover:bg-[var(--color-surface-hover)]">
                                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">#{u.id}</td>
                                                    <td className="max-w-[220px] px-4 py-3 font-medium whitespace-normal">
                                                        {unitTitle(u)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                        {u.entityType?.name ?? "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                        {u.warehouse ? `${u.warehouse.code} · ${u.warehouse.name}` : "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                        {u.sector?.code ?? "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                        {u.storageSpace?.code ?? "—"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="neutral" label={u.availabilityStatus} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
