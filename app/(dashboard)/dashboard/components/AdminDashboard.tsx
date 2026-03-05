"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// Icons 
function ArrowUpRightIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>; }
function ArrowDownRightIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" /></svg>; }
function ExclamationIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; }
function PackageIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>; }
function WarningHexIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M3.86 16.35 12 21.08l8.14-4.73A1 1 0 0 0 21.08 16V8a1 1 0 0 0-.54-.85L12 2.42 3.86 7.15A1 1 0 0 0 3.32 8v8a1 1 0 0 0 .54.85Z" /></svg>; }

const MOCK_MOVEMENTS = [
    { id: "MV-2391", type: "ENTRY", date: "Hoy, 09:30", item: "Laptop Pro X1", qty: "+50", status: "Completado" },
    { id: "MV-2390", type: "EXIT", date: "Ayer, 16:45", item: "Teclado Mecánico K3", qty: "-15", status: "En Ruta" },
    { id: "MV-2389", type: "ADJUST", date: "Ayer, 12:00", item: "Monitor 27'' IPS", qty: "-2", status: "Auditado" },
    { id: "MV-2388", type: "ENTRY", date: "Hace 2 días", item: "Mouse Inalámbrico M1", qty: "+100", status: "Completado" },
];

import type { Warehouse } from "@/types";

const MOCK_WAREHOUSE: Warehouse = {
    warehouse_id: "WH-001",
    code: "BOD-CENTRAL",
    name: "Bodega Central",
    address: "Av. Principal 123",
    total_capacity_m2: 5000,
    available_capacity_m2: 1250,
    city_id: "CTY-100",
    warehouse_type_id: "WT-01"
};

export function AdminDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Cabecera Administrativa */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Resumen de {MOCK_WAREHOUSE.name}
                    </h1>
                    <p className="mt-1 text-lg" style={{ color: "var(--color-text-tertiary)" }}>
                        Gestión global de inventario. {new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="md" className="gap-2">
                        <ArrowDownRightIcon /> Salida
                    </Button>
                    <Button variant="primary" size="md" className="gap-2">
                        <ArrowUpRightIcon /> Ingreso
                    </Button>
                </div>
            </div>

            {/* Tarjetas KPI de Resumen (Stock) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-shadow"
                    style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] flex items-center justify-center mb-3">
                            <PackageIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Ocupación de Espacio (m²)</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                            {(((MOCK_WAREHOUSE.total_capacity_m2 - MOCK_WAREHOUSE.available_capacity_m2) / MOCK_WAREHOUSE.total_capacity_m2) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                            Libre: {MOCK_WAREHOUSE.available_capacity_m2.toLocaleString()} m² de {MOCK_WAREHOUSE.total_capacity_m2.toLocaleString()} m²
                        </p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                    style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-subtle)] text-[var(--color-warning-strong)] flex items-center justify-center mb-3">
                            <WarningHexIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Stock Bajo (Crítico)</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold" style={{ color: "var(--color-warning-strong)" }}>24</p>
                        <p className="text-xs mt-1 underline cursor-pointer" style={{ color: "var(--color-text-tertiary)" }}>Revisar lista urgente</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-shadow"
                    style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)] flex items-center justify-center mb-3">
                            <ExclamationIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Agotados (Out of Stock)</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold" style={{ color: "var(--color-danger-strong)" }}>8</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Pérdida de oportunidad</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-shadow"
                    style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        {/* Pequeño minigráfico mockeado (CSS) para métrica financiera */}
                        <div className="flex items-end gap-1 h-10 mb-3 opacity-80" style={{ color: "var(--color-success-strong)" }}>
                            <div className="w-2 h-4 bg-current rounded-sm"></div>
                            <div className="w-2 h-6 bg-current rounded-sm"></div>
                            <div className="w-2 h-5 bg-current rounded-sm"></div>
                            <div className="w-2 h-8 bg-current rounded-sm"></div>
                            <div className="w-2 h-10 bg-current rounded-sm"></div>
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Movimientos Hoy</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>152</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Día activo (Prom. 120)</p>
                    </div>
                </div>
            </div>

            {/* Tabla de Movimientos y Alertas Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <section className="col-span-1 lg:col-span-2 rounded-2xl border" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Últimos Movimientos</h2>
                        <Button variant="outline" size="sm" className="hidden sm:inline-flex">Ver Todos</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b text-xs uppercase" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)", background: "var(--color-surface-hover)" }}>
                                    <th className="font-semibold p-4 text-left">ID Mov.</th>
                                    <th className="font-semibold p-4 text-left">Tipo</th>
                                    <th className="font-semibold p-4 text-left">Producto</th>
                                    <th className="font-semibold p-4 text-right">Cant.</th>
                                    <th className="font-semibold p-4 text-left">Fecha</th>
                                    <th className="font-semibold p-4 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_MOVEMENTS.map((mov) => (
                                    <tr key={mov.id} className="border-b last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors text-sm" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
                                        <td className="p-4 font-mono text-xs">{mov.id}</td>
                                        <td className="p-4">
                                            {mov.type === 'ENTRY' ?
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium" style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)" }}>Entrada</span> :
                                                mov.type === 'EXIT' ?
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium" style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand-strong)" }}>Salida</span> :
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium" style={{ background: "var(--color-warning-subtle)", color: "var(--color-warning-strong)" }}>Ajuste</span>
                                            }
                                        </td>
                                        <td className="p-4 font-medium">{mov.item}</td>
                                        <td className="p-4 text-right font-mono font-medium" style={{ color: mov.qty.startsWith('+') ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                                            {mov.qty}
                                        </td>
                                        <td className="p-4" style={{ color: "var(--color-text-secondary)" }}>{mov.date}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs border" style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                                                {mov.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="col-span-1 space-y-4">
                    <div className="rounded-2xl border p-5" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Accesos Directos</h2>
                        <div className="flex flex-col gap-2">
                            <Button variant="outline" className="justify-start shadow-sm bg-[var(--color-surface-hover)]">➕ Nuevo Producto al Catálogo</Button>
                            <Link href="/dashboard/users/create" passHref>
                                <Button variant="outline" className="w-full justify-start shadow-sm bg-[var(--color-surface-hover)]">👥 Gestionar Usuarios (Op)</Button>
                            </Link>
                            <Button variant="outline" className="justify-start shadow-sm bg-[var(--color-surface-hover)]">📊 Descargar Reporte EOD</Button>
                        </div>
                    </div>
                    <div className="rounded-2xl border p-5" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                        <div className="flex items-center gap-2 mb-2">
                            <WarningHexIcon />
                            <h2 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>Alertas Pendientes</h2>
                        </div>
                        <ul className="space-y-3 mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            <li className="flex gap-2">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[var(--color-danger-strong)]"></div>
                                <p><strong>Audífonos Q2</strong> llegaron a 0 unidades. Requiere re-abastecimiento inmediato.</p>
                            </li>
                            <li className="flex gap-2">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[var(--color-warning-strong)]"></div>
                                <p>Hay una discrepancia de conteo reportada ayer en el pasillo A4.</p>
                            </li>
                        </ul>
                    </div>
                </section>

            </div>

        </div>
    );
}
