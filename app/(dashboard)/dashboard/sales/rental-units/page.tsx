"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, Input, Label } from "@/components/ui";
import { Badge } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { listRentalUnits } from "@/modules/sales";
import type { RentalUnit } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { userHasRole } from "@/shared/auth/primaryRole";
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

function AdminRedirect() {
    const router = useRouter();
    const { user, initialized, isLoading } = useAuth();
    const isAuthReady = initialized && !isLoading;
    const isAdmin = user?.roles?.some((r) => r.role_name === UserRole.ADMIN) ?? false;

    useEffect(() => {
        if (!isAuthReady || !isAdmin) return;
        router.replace("/dashboard/sales/commercial-pricing");
    }, [isAdmin, isAuthReady, router]);

    if (!isAuthReady) {
        return null;
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
            Redirigiendo a parametrización comercial…
        </div>
    );
}

export default function RentalUnitsListPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard
                allowedRoles={[UserRole.ADMIN, UserRole.SALES_AGENT]}
                unauthorizedMode="redirect"
                redirectTo="/dashboard"
            >
                <RentalUnitsGate />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}

function RentalUnitsGate() {
    const { user, initialized, isLoading } = useAuth();
    const isAuthReady = initialized && !isLoading;
    const isAdmin = user?.roles?.some((r) => r.role_name === UserRole.ADMIN) ?? false;

    if (!isAuthReady) {
        return null;
    }

    if (isAdmin) {
        return <AdminRedirect />;
    }

    return <RentalUnitsSalesContent />;
}

function RentalUnitsSalesContent() {
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
        <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    Unidades de arrendamiento
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Consulta el catálogo operativo: unidades disponibles para ofertar, ubicación y estado de
                    disponibilidad. Usa el rango de fechas para acotar el periodo. Los precios y la activación comercial
                    se gestionan en Parametrización comercial (administración).
                </p>
            </div>

            <Alert variant="info" className="rounded-xl">
                <p>
                    ¿Lista vacía? Verifica la estructura en{" "}
                    <Link href="/dashboard/infrastructure" className="font-semibold underline">
                        Infraestructura
                    </Link>{" "}
                    y, si el flujo comercial lo requiere, que un administrador sincronice el catálogo desde{" "}
                    <Link href="/dashboard/sales/commercial-pricing" className="font-semibold underline">
                        Parametrización comercial
                    </Link>
                    .
                </p>
                <p className="mt-2">
                    Si no puedes continuar con contratos por tarifas, revisa{" "}
                    <Link href="/dashboard/sales/commercial-pricing" className="font-semibold underline">
                        Parametrización comercial
                    </Link>
                    .
                </p>
            </Alert>

            {error ? (
                <Alert variant="danger" className="flex items-center justify-between gap-3 rounded-lg">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => void fetchUnits()}>
                        Reintentar
                    </Button>
                </Alert>
            ) : null}

            <Card>
                <CardBody className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="min-w-[160px]">
                            <Label htmlFor="ru-start" size="sm" className="mb-1 block">
                                Desde
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
                                Hasta
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
                        El rango de fechas ayuda a revisar la disponibilidad por periodo.
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
                                                Revisa filtros de fecha, la infraestructura o solicita a un administrador
                                                que sincronice el catálogo desde Parametrización comercial.
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
    );
}
