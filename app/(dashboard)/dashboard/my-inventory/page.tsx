"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody, Button } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { useAuth } from "@/hooks/useAuth";
import { getMyActiveContracts } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import type { Contract, ContractRentalUnit } from "@/modules/sales";
import { UserRole } from "@/types";

function resolveUnitLabel(unit: ContractRentalUnit): string {
    const ru = unit.rentalUnit;
    if (!ru) {
        return unit.rentalUnitId > 0 ? `Unidad #${unit.rentalUnitId}` : "Unidad contratada";
    }
    const fromApi =
        ru.referenceName?.trim() ||
        ru.displayName?.trim() ||
        ru.displaySummary?.trim() ||
        "";
    if (fromApi) return fromApi;
    return (
        ru.warehouse?.name ||
        ru.sector?.code ||
        ru.storageSpace?.code ||
        (unit.rentalUnitId > 0 ? `Unidad #${unit.rentalUnitId}` : "Unidad contratada")
    );
}

function warehouseGroupKey(unit: ContractRentalUnit): string {
    const w = unit.rentalUnit?.warehouse;
    if (w?.id != null && w.id > 0) return `wh:${w.id}`;
    const name = w?.name?.trim();
    if (name) return `name:${name.toLowerCase()}`;
    return "otros";
}

function warehouseGroupTitle(unit: ContractRentalUnit): string {
    return unit.rentalUnit?.warehouse?.name?.trim() || "Unidades sin bodega asociada";
}

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        if (error.status === 401)
            return "Sesión expirada o no enviada al API (cookie de acceso). Vuelva a iniciar sesión.";
        if (error.status === 403) return "No tienes permisos para consultar tus bodegas.";
        return error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar tus bodegas.";
}

type GroupedRow = {
    key: string;
    title: string;
    contractId: number;
    contractRentalUnitId: number;
    label: string;
    vigencia: string;
};

export default function ClientMyWarehousesPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const clientId = user?.client_id ? Number(user.client_id) : null;

    const load = useCallback(async () => {
        if (!clientId) {
            setContracts([]);
            setIsLoading(false);
            setError("Tu cuenta no está vinculada a un cliente comercial.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMyActiveContracts();
            setContracts(data.filter((c) => c.clientId === clientId));
        } catch (err) {
            setError(getApiErrorMessage(err));
            setContracts([]);
        } finally {
            setIsLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        void load();
    }, [load]);

    const groupedRows = useMemo(() => {
        const map = new Map<string, { title: string; rows: GroupedRow[] }>();
        for (const contract of contracts) {
            for (const unit of contract.contractRentalUnits) {
                const gKey = warehouseGroupKey(unit);
                const title = warehouseGroupTitle(unit);
                if (!map.has(gKey)) {
                    map.set(gKey, { title, rows: [] });
                }
                const bucket = map.get(gKey)!;
                if (bucket.title === "Unidades sin bodega asociada" && title !== "Unidades sin bodega asociada") {
                    bucket.title = title;
                }
                bucket.rows.push({
                    key: `${contract.contractId}-${unit.contractRentalUnitId}`,
                    title,
                    contractId: contract.contractId,
                    contractRentalUnitId: unit.contractRentalUnitId,
                    label: resolveUnitLabel(unit),
                    vigencia: `${unit.startDate} → ${unit.endDate}`,
                });
            }
        }
        return [...map.entries()].map(([key, v]) => ({ key, title: v.title, rows: v.rows }));
    }, [contracts]);

    const totalUnits = useMemo(
        () => contracts.reduce((sum, c) => sum + c.contractRentalUnits.length, 0),
        [contracts]
    );

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.CLIENT]}>
                <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Mis bodegas</h1>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                Contratos activos según el API (
                                <code className="text-xs">GET /api/sales/contracts/me/active</code>
                                ), agrupados por bodega cuando hay datos de ubicación.
                            </p>
                        </div>
                        <Button variant="outline" type="button" onClick={() => void load()} disabled={isLoading}>
                            Recargar
                        </Button>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger-strong)]"
                        >
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardBody className="p-4">
                                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                                    Contratos activos
                                </p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{contracts.length}</p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody className="p-4">
                                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                                    Unidades en contrato
                                </p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalUnits}</p>
                            </CardBody>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {isLoading ? (
                            <Card>
                                <CardBody className="p-6 space-y-3">
                                    <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                    <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                    <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                </CardBody>
                            </Card>
                        ) : contracts.length === 0 ? (
                            <Card>
                                <CardBody className="p-6 text-sm text-[var(--color-text-secondary)]">
                                    No tienes bodegas asociadas en contratos activos. Cuando el backend marque un contrato
                                    como activo, aparecerá aquí.
                                </CardBody>
                            </Card>
                        ) : (
                            groupedRows.map((group) => (
                                <Card key={group.key}>
                                    <CardBody className="p-0">
                                        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-4 py-3">
                                            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                {group.title}
                                            </h2>
                                            <p className="text-xs text-[var(--color-text-secondary)]">
                                                {group.rows.length}{" "}
                                                {group.rows.length === 1 ? "unidad" : "unidades"}
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[var(--color-text-secondary)]">
                                                    <tr>
                                                        <th className="px-4 py-2 text-xs font-semibold uppercase">
                                                            Contrato
                                                        </th>
                                                        <th className="px-4 py-2 text-xs font-semibold uppercase">
                                                            Unidad
                                                        </th>
                                                        <th className="px-4 py-2 text-xs font-semibold uppercase">
                                                            Vigencia línea
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                                    {group.rows.map((row) => (
                                                        <tr key={row.key}>
                                                            <td className="px-4 py-3 font-semibold">#{row.contractId}</td>
                                                            <td className="max-w-[min(420px,55vw)] truncate px-4 py-3" title={row.label}>
                                                                {row.label}
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                                {row.vigencia}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardBody>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
