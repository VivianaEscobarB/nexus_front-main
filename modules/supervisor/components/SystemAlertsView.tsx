"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { appEnv } from "@/lib/config/env";
import { listAlerts } from "@/modules/supervisor/api/supervisorWarehouseApi";
import type { JsonRecord } from "@/modules/supervisor/api/supervisorWarehouseTypes";
import { pickFirstString } from "@/modules/supervisor/api/supervisorWarehouseDisplay";
import { isApiError } from "@/shared/api/apiError";

type AlertSeverity = "critico" | "alerta" | "advertencia";

type SystemAlert = {
    id: string;
    product: string;
    metaLine: string;
    reason: string;
    severity: AlertSeverity;
    /** Si existe en el DTO, permite abrir consulta de inventario con filtro. */
    detailProductId: string | null;
    detailStorageSpaceId: string | null;
};

const CONSULTA_INVENTARIO_PATH = "/dashboard/consulta-inventario";

const LINK_BUTTON_OUTLINE_SM =
    "inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-border-strong " +
    "bg-transparent px-3 text-xs font-medium text-text-secondary transition-all duration-200 " +
    "hover:bg-surface-hover active:bg-surface-active focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-border-focus focus-visible:ring-offset-2 sm:w-auto";

function normalizeSeverity(raw: unknown): AlertSeverity {
    const s = typeof raw === "string" ? raw.toLowerCase() : "";
    if (/critical|critico|danger|error|high/.test(s)) return "critico";
    if (/warn|alerta|medium/.test(s)) return "alerta";
    return "advertencia";
}

function mapDtoToAlert(raw: JsonRecord, index: number): SystemAlert {
    const id = pickFirstString(raw, ["id", "alertId", "uuid"]) ?? String(index);
    const product =
        pickFirstString(raw, ["productName", "product", "title", "name", "sku", "code"]) ??
        "Alerta";
    const metaLine =
        pickFirstString(raw, [
            "lotCode",
            "lot",
            "batch",
            "location",
            "storageSpace",
            "warehouse",
            "sector",
        ]) ?? "";
    const reason =
        pickFirstString(raw, ["message", "description", "reason", "detail", "notes"]) ??
        "";

    const detailProductId = pickFirstString(raw, [
        "productId",
        "product_id",
        "itemId",
        "catalogProductId",
        "productUuid",
    ]);
    const detailStorageSpaceId = pickFirstString(raw, [
        "storageSpaceId",
        "storage_space_id",
        "spaceId",
        "locationId",
        "positionId",
    ]);

    return {
        id,
        product,
        metaLine: metaLine || "—",
        reason: reason || "Sin detalle adicional.",
        severity: normalizeSeverity(raw.severity ?? raw.level ?? raw.type ?? raw.priority),
        detailProductId,
        detailStorageSpaceId,
    };
}

function buildConsultaInventarioHref(alert: SystemAlert): string | null {
    const params = new URLSearchParams();
    if (alert.detailProductId) {
        params.set("productId", alert.detailProductId);
    }
    if (alert.detailStorageSpaceId) {
        params.set("storageSpaceId", alert.detailStorageSpaceId);
    }
    const q = params.toString();
    return q ? `${CONSULTA_INVENTARIO_PATH}?${q}` : null;
}

function getLoadErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar las alertas.";
}

function severityBadge(severity: AlertSeverity) {
    switch (severity) {
        case "critico":
            return <Badge variant="danger" label="Crítico" size="sm" />;
        case "alerta":
            return <Badge variant="warning" label="Alerta" size="sm" />;
        case "advertencia":
            return (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/60">
                    Advertencia
                </span>
            );
        default:
            return <Badge variant="neutral" label="—" size="sm" />;
    }
}

function severityIconWrap(severity: AlertSeverity) {
    const base =
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm";
    const bg =
        severity === "critico"
            ? "bg-danger-default"
            : severity === "alerta"
              ? "bg-warning-default"
              : "bg-amber-500";
    return (
        <div className={`${base} ${bg}`} aria-hidden>
            <ExclamationIcon className="h-6 w-6" />
        </div>
    );
}

function AlertCardActions({ alert }: { alert: SystemAlert }) {
    const detailHref = buildConsultaInventarioHref(alert);
    return (
        <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:pl-4">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                leftIcon={<BellIcon className="h-4 w-4" />}
                disabled
                title="Próximamente: notificación al cliente desde Nexus."
            >
                Notificar cliente
            </Button>
            {detailHref ? (
                <Link href={detailHref} className={LINK_BUTTON_OUTLINE_SM} scroll>
                    <EyeIcon className="h-4 w-4 shrink-0" />
                    Ver inventario
                </Link>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    leftIcon={<EyeIcon className="h-4 w-4" />}
                    disabled
                    title="La alerta no incluye productId ni storageSpaceId para abrir la consulta. Revisa el contrato del API o usa la consulta manual."
                >
                    Ver inventario
                </Button>
            )}
        </div>
    );
}

export function SystemAlertsView() {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const rows = await listAlerts();
            setAlerts(rows.map((row, i) => mapDtoToAlert(row, i)));
        } catch (e) {
            setError(getLoadErrorMessage(e));
            setAlerts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-10">
            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                    Alertas del sistema
                </h2>
                <p className="text-sm text-text-secondary">
                    Revisa las alertas importantes que requieren tu atención.
                    {appEnv.isDevelopment ? (
                        <>
                            {" "}
                            <span className="font-mono text-xs text-text-tertiary">GET /api/alerts</span>
                        </>
                    ) : null}
                </p>
            </header>

            {error ? (
                <p className="rounded-lg border border-danger-default/40 bg-danger-subtle px-3 py-2 text-sm text-danger-strong">
                    {error}
                </p>
            ) : null}

            {isLoading ? (
                <p className="text-sm text-text-tertiary">Cargando alertas…</p>
            ) : null}

            <ul className="space-y-4" aria-label="Lista de alertas">
                {!isLoading && !error && alerts.length === 0 ? (
                    <li>
                        <Card>
                            <CardBody className="p-6 text-center text-sm text-text-tertiary">
                                No hay alertas registradas en este momento.
                            </CardBody>
                        </Card>
                    </li>
                ) : null}
                {alerts.map((alert) => (
                    <li key={alert.id}>
                        <Card>
                            <CardBody className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex gap-4 min-w-0">
                                        {severityIconWrap(alert.severity)}
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div>
                                                <h3 className="font-semibold text-text-primary">
                                                    {alert.product}
                                                </h3>
                                                <p className="text-sm text-text-tertiary">{alert.metaLine}</p>
                                            </div>
                                            <p className="text-sm text-text-secondary">{alert.reason}</p>
                                            <div className="pt-0.5">{severityBadge(alert.severity)}</div>
                                        </div>
                                    </div>
                                    <AlertCardActions alert={alert} />
                                </div>
                            </CardBody>
                        </Card>
                    </li>
                ))}
            </ul>

            <div className="flex justify-center pt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<ArrowPathMini className="h-4 w-4" />}
                    onClick={() => void load()}
                    disabled={isLoading}
                >
                    Actualizar lista
                </Button>
            </div>
        </div>
    );
}

function ArrowPathMini({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    );
}

function ExclamationIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
    );
}

function BellIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
    );
}

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
    );
}
