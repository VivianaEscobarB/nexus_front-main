"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { syncRentalUnitsCatalog } from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible ejecutar la sincronización.";
}

export default function CommercialSyncPage() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setError(null);
        setMessage(null);
        try {
            const detail = await syncRentalUnitsCatalog();
            setMessage(detail ?? "Sincronización solicitada correctamente. En unos segundos deberían aparecer las unidades en listados y catálogo.");
        } catch (err) {
            if (isApiError(err) && err.status === 403) {
                setError("No tienes permisos para ejecutar la sincronización (solo ADMIN).");
            } else if (isApiError(err) && err.status === 409) {
                setError(`Conflicto: ${err.message}`);
            } else {
                setError(getApiErrorMessage(err));
            }
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.ADMIN]}>
                <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Sincronización catálogo comercial
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                            Las <strong>unidades de arrendamiento (rental units)</strong> no se crean desde un formulario
                            comercial único: el sistema las genera a partir de la <strong>estructura física</strong>{" "}
                            (bodegas, sectores, espacios) en <Link className="font-semibold text-[var(--color-brand-strong)] underline" href="/dashboard/infrastructure">Infraestructura</Link>{" "}
                            y de eventos de sincronización. Use esta acción para un <strong>resync masivo</strong> si
                            hubo datos previos a los eventos en tiempo real o tras cargas históricas.
                        </p>
                    </div>

                    <Card>
                        <CardBody className="space-y-4 p-6">
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Endpoint: <code className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-xs">POST /api/sales/rental-units/sync</code>
                            </p>
                            {message ? (
                                <div
                                    role="status"
                                    className="rounded-lg border border-[var(--color-success-default)] bg-[var(--color-success-subtle)] px-4 py-3 text-sm text-[var(--color-success-strong)]"
                                >
                                    {message}
                                </div>
                            ) : null}
                            {error ? (
                                <div
                                    role="alert"
                                    className="rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]"
                                >
                                    {error}
                                </div>
                            ) : null}
                            <Button variant="primary" onClick={() => void handleSync()} isLoading={isSyncing} disabled={isSyncing}>
                                {isSyncing ? "Sincronizando…" : "Resincronizar catálogo físico → rental units"}
                            </Button>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                Evite pulsar repetidamente mientras la solicitud está en curso. Tras el OK, revise{" "}
                                <Link href="/dashboard/sales/rental-units" className="font-semibold underline">
                                    Unidades de arrendamiento
                                </Link>{" "}
                                o la{" "}
                                <Link href="/dashboard/sales/commercial-pricing" className="font-semibold underline">
                                    Parametrización comercial
                                </Link>
                                .
                            </p>
                        </CardBody>
                    </Card>

                    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-text-secondary)]">
                        <p className="font-semibold text-[var(--color-text-primary)]">Avanzado (no recomendado en panel)</p>
                        <p className="mt-1">
                            El API puede exponer <code className="text-xs">POST /api/sales/rental-units</code> con cuerpo
                            JPA completo; no es el flujo principal para operación comercial. Priorice bodega + sync.
                        </p>
                    </div>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
