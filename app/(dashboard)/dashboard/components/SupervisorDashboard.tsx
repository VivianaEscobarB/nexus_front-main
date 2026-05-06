"use client";

import * as React from "react";
import Link from "next/link";
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    Pagination,
    Select,
    StatCard,
} from "@/components/ui";
import { listWarehouses, type ManagedWarehouse } from "@/modules/infrastructure";
import { listContracts, type Contract } from "@/modules/sales";
import { appEnv } from "@/lib/config/env";
import { getInventoryOverview } from "@/modules/supervisor/api/supervisorWarehouseApi";
import { isApiError } from "@/shared/api/apiError";
import { usePagination } from "@/shared/hooks/usePagination";

const SUPERVISOR_QUICK_LINKS = [
    {
        href: "/dashboard/supervisor/alertas-sistema",
        title: "Alertas del sistema",
        description: "Revisa vencimientos, stock bajo y señales urgentes.",
    },
    {
        href: "/dashboard/consulta-inventario",
        title: "Consulta de inventario",
        description: "Busca existencias por producto y espacio de almacenamiento.",
    },
    {
        href: "/dashboard/historial-movimientos",
        title: "Historial de movimientos",
        description: "Audita movimientos y, si aplica, el kardex desde el API.",
    },
] as const;

const CONTRACTED_STATUSES = new Set<Contract["status"]>([
    "ACTIVE",
    "PENDING_PAYMENT",
]);

type WarehouseSummary = {
    warehouse: ManagedWarehouse;
    activeContractCount: number;
    activeUnitsCount: number;
    contracted: boolean;
    operational: boolean;
};

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar el estado global de bodegas.";
}

function summarizeInventoryOverview(data: unknown): { label: string; value: string }[] {
    if (!data || typeof data !== "object") {
        return [];
    }
    const o = data as Record<string, unknown>;
    const out: { label: string; value: string }[] = [];
    for (const [key, v] of Object.entries(o)) {
        if (typeof v === "number" && Number.isFinite(v)) {
            out.push({ label: key, value: String(v) });
        } else if (typeof v === "string" && v.trim()) {
            out.push({ label: key, value: v.trim() });
        }
    }
    return out.slice(0, 8);
}

function isOperationalWarehouse(warehouse: ManagedWarehouse): boolean {
    return (
        warehouse.operationalStatus !== "INACTIVE" &&
        warehouse.active !== false &&
        warehouse.status !== "INACTIVE"
    );
}

function toWarehouseSummary(
    warehouses: ManagedWarehouse[],
    contracts: Contract[]
): WarehouseSummary[] {
    const contractCountByWarehouse = new Map<string, number>();
    const unitsCountByWarehouse = new Map<string, number>();

    for (const contract of contracts) {
        if (!CONTRACTED_STATUSES.has(contract.status)) {
            continue;
        }

        const warehouseIdsInContract = new Set<string>();
        for (const contractUnit of contract.contractRentalUnits) {
            const warehouseId = contractUnit.rentalUnit?.warehouse?.id;
            if (warehouseId == null) {
                continue;
            }
            const key = String(warehouseId);
            unitsCountByWarehouse.set(key, (unitsCountByWarehouse.get(key) ?? 0) + 1);
            warehouseIdsInContract.add(key);
        }

        for (const warehouseId of warehouseIdsInContract) {
            contractCountByWarehouse.set(
                warehouseId,
                (contractCountByWarehouse.get(warehouseId) ?? 0) + 1
            );
        }
    }

    return warehouses
        .map((warehouse) => {
            const id = String(warehouse.id);
            const activeContractCount = contractCountByWarehouse.get(id) ?? 0;
            const activeUnitsCount = unitsCountByWarehouse.get(id) ?? 0;
            return {
                warehouse,
                activeContractCount,
                activeUnitsCount,
                contracted: activeContractCount > 0,
                operational: isOperationalWarehouse(warehouse),
            };
        })
        .sort((a, b) => a.warehouse.name.localeCompare(b.warehouse.name, "es"));
}

export function SupervisorDashboard() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");
    const [contractFilter, setContractFilter] = React.useState<
        "ALL" | "CONTRACTED" | "UNCONTRACTED"
    >("ALL");
    const [operationFilter, setOperationFilter] = React.useState<
        "ALL" | "OPERATIONAL" | "INACTIVE"
    >("ALL");
    const [rows, setRows] = React.useState<WarehouseSummary[]>([]);
    const [overviewPairs, setOverviewPairs] = React.useState<
        { label: string; value: string }[] | null
    >(null);
    const [overviewMessage, setOverviewMessage] = React.useState<string | null>(null);
    const [overviewLoading, setOverviewLoading] = React.useState(false);

    const loadGlobalSummary = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [warehouses, contracts] = await Promise.all([
                listWarehouses(),
                listContracts(),
            ]);
            setRows(toWarehouseSummary(warehouses, contracts));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadGlobalSummary();
    }, [loadGlobalSummary]);

    const loadInventoryOverview = React.useCallback(async () => {
        setOverviewLoading(true);
        setOverviewMessage(null);
        try {
            const data = await getInventoryOverview();
            const pairs = summarizeInventoryOverview(data);
            setOverviewPairs(pairs.length ? pairs : null);
            if (!pairs.length) {
                setOverviewMessage(
                    "El servicio respondió, pero no hay indicadores listos para mostrar. Cuando el backend defina el formato, aparecerán aquí."
                );
            }
        } catch (e) {
            setOverviewPairs(null);
            if (isApiError(e) && e.status === 404) {
                setOverviewMessage(
                    "El resumen de inventario no está disponible en este entorno todavía."
                );
            } else if (isApiError(e) && e.status === 403) {
                setOverviewMessage(
                    "No tienes permiso para ver el resumen de inventario, o el acceso está restringido por configuración del servidor."
                );
            } else {
                setOverviewMessage(getErrorMessage(e));
            }
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadInventoryOverview();
    }, [loadInventoryOverview]);

    const filteredRows = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (contractFilter === "CONTRACTED" && !row.contracted) return false;
            if (contractFilter === "UNCONTRACTED" && row.contracted) return false;
            if (operationFilter === "OPERATIONAL" && !row.operational) return false;
            if (operationFilter === "INACTIVE" && row.operational) return false;

            if (!query) return true;
            return `${row.warehouse.name} ${row.warehouse.code} ${row.warehouse.address}`
                .toLowerCase()
                .includes(query);
        });
    }, [rows, search, contractFilter, operationFilter]);

    const contractedCount = React.useMemo(
        () => rows.filter((row) => row.contracted).length,
        [rows]
    );
    const uncontractedCount = rows.length - contractedCount;
    const inactiveCount = React.useMemo(
        () => rows.filter((row) => !row.operational).length,
        [rows]
    );
    const activeUnitsCount = React.useMemo(
        () => rows.reduce((acc, row) => acc + row.activeUnitsCount, 0),
        [rows]
    );

    const {
        paginatedData: paginatedRows,
        currentPage,
        totalPages,
        goToPage,
    } = usePagination(filteredRows, 8);

    return (
        <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Estado global de bodegas
                </h1>
                <p className="mt-3 max-w-4xl text-base leading-7 text-[var(--color-text-secondary)]">
                    Supervisa contratos, operatividad por sede y decide con datos del día: alertas,
                    inventario y movimientos están a un clic.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/dashboard/infrastructure">
                        <Button variant="primary">Gestionar estructura</Button>
                    </Link>
                    <Button variant="outline" onClick={() => void loadGlobalSummary()}>
                        Actualizar resumen
                    </Button>
                </div>

                <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                        Accesos rápidos
                    </h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {SUPERVISOR_QUICK_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/35 p-4 transition-colors hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-default)]/30"
                            >
                                <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-text-primary)]">
                                    {item.title}
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                    {item.description}
                                </p>
                                <span className="mt-3 inline-flex text-sm font-medium text-[var(--color-brand-strong)] group-hover:underline">
                                    Ir
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <Card>
                <CardHeader
                    title="Indicadores de inventario"
                    description="Cifras consolidadas de existencias cuando el servicio de resumen esté activo. Si no ves datos, el backend puede estar en despliegue o con permisos limitados."
                />
                <CardBody className="space-y-3">
                    {appEnv.isDevelopment ? (
                        <details className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/50 px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
                            <summary className="cursor-pointer font-medium text-[var(--color-text-secondary)]">
                                Detalle técnico (solo entorno desarrollo)
                            </summary>
                            <p className="mt-2 leading-relaxed">
                                Origen: <code className="text-[var(--color-text-secondary)]">GET /api/inventory/overview</code>
                                . Los errores 403 en rutas bajo{" "}
                                <code className="text-[var(--color-text-secondary)]">/api/inventory/**</code> pueden deberse a{" "}
                                <code className="text-[var(--color-text-secondary)]">SecurityConfig</code> antes del
                                controlador.
                            </p>
                        </details>
                    ) : null}
                    {overviewLoading ? (
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                            Cargando indicadores…
                        </p>
                    ) : null}
                    {overviewMessage && !overviewLoading ? (
                        <Alert variant="warning" className="rounded-xl text-sm">
                            {overviewMessage}
                        </Alert>
                    ) : null}
                    {overviewPairs && overviewPairs.length > 0 ? (
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {overviewPairs.map((pair) => (
                                <div
                                    key={pair.label}
                                    className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/40 px-4 py-3"
                                >
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                        {pair.label}
                                    </dt>
                                    <dd className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
                                        {pair.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => void loadInventoryOverview()}>
                        Actualizar indicadores
                    </Button>
                </CardBody>
            </Card>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Bodegas totales" value={rows.length} />
                <StatCard
                    title="Con contrato vigente"
                    value={contractedCount}
                    delta="Priorizadas"
                    deltaType="positive"
                />
                <StatCard
                    title="Sin contrato vigente"
                    value={uncontractedCount}
                    delta="Pendientes"
                    deltaType="neutral"
                />
                <StatCard title="Unidades contratadas" value={activeUnitsCount} />
            </section>

            <Card>
                <CardHeader
                    title="Clasificación de bodegas"
                    description="Filtra por contratación y estado operativo para focalizar seguimiento y despliegue diario."
                />
                <CardBody className="space-y-5">
                    {error ? (
                        <Alert variant="danger" className="rounded-xl">
                            {error}
                        </Alert>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                        <Input
                            label="Buscar bodega"
                            placeholder="Nombre, código o dirección"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <Select
                            label="Contratación"
                            value={contractFilter}
                            onChange={(event) =>
                                setContractFilter(
                                    event.target.value as
                                        | "ALL"
                                        | "CONTRACTED"
                                        | "UNCONTRACTED"
                                )
                            }
                            options={[
                                { value: "ALL", label: "Todas" },
                                { value: "CONTRACTED", label: "Con contrato vigente" },
                                { value: "UNCONTRACTED", label: "Sin contrato vigente" },
                            ]}
                        />
                        <Select
                            label="Operación"
                            value={operationFilter}
                            onChange={(event) =>
                                setOperationFilter(
                                    event.target.value as
                                        | "ALL"
                                        | "OPERATIONAL"
                                        | "INACTIVE"
                                )
                            }
                            options={[
                                { value: "ALL", label: "Todas" },
                                { value: "OPERATIONAL", label: "Operativas" },
                                { value: "INACTIVE", label: "No operativas" },
                            ]}
                        />
                    </div>

                    <div className="rounded-xl border border-[var(--color-border-subtle)] overflow-x-auto">
                        <table className="w-full min-w-[840px] text-left text-sm">
                            <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Bodega</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Ubicación</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Operación</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Contratación</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Contratos vigentes</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase">Unidades activas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-[var(--color-text-secondary)]"
                                        >
                                            Cargando estado global...
                                        </td>
                                    </tr>
                                ) : paginatedRows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-[var(--color-text-secondary)]"
                                        >
                                            No hay bodegas que coincidan con los filtros.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <tr key={row.warehouse.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-[var(--color-text-primary)]">
                                                    {row.warehouse.name}
                                                </p>
                                                <p className="text-xs text-[var(--color-text-tertiary)]">
                                                    {row.warehouse.code}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                {row.warehouse.address || "Sin dirección"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    label={row.operational ? "Operativa" : "No operativa"}
                                                    variant={row.operational ? "success" : "neutral"}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    label={
                                                        row.contracted
                                                            ? "Con contrato vigente"
                                                            : "Sin contrato vigente"
                                                    }
                                                    variant={row.contracted ? "brand" : "warning"}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-[var(--color-text-primary)]">
                                                {row.activeContractCount}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--color-text-primary)]">
                                                {row.activeUnitsCount}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                            Bodegas no operativas: {inactiveCount}
                        </p>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.max(1, totalPages)}
                            onPageChange={goToPage}
                        />
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
