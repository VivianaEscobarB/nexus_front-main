"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

// Icons 
function InboxIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>; }
function ExclamationIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; }
function CheckIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>; }

const PENDING_ALLOCATIONS = [
    { id: "CT-901", client: "Mega Foods SA", size: "150m²", type: "Alimentos", status: "Pago Aprobado" },
    { id: "CT-902", client: "Textiles del Norte", size: "400m²", type: "Textil", status: "Pago Aprobado" },
];

const DISCREPANCIES = [
    { id: "AUD-45A", sector: "Pasillo B-12", issue: "Faltante 2 unidades SKU-911", date: "Hoy, 08:30" },
    { id: "AUD-42C", sector: "Pasillo C-01", issue: "Producto en ubicación incorrecta", date: "Ayer, 16:40" },
];

export function SupervisorDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Panel de Supervisión
                    </h1>
                    <p className="mt-1 text-lg" style={{ color: "var(--color-text-tertiary)" }}>
                        Aprobaciones pendientes y control de discrepancias ({new Date().toLocaleDateString('es-ES')}).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="md" className="gap-2 bg-[var(--color-surface-hover)]">
                        Descargar Reporte Audición
                    </Button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] flex items-center justify-center mb-3">
                            <InboxIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Asignaciones Pendientes</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-brand-strong">{PENDING_ALLOCATIONS.length}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Listas para ubicación física</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-subtle)] text-[var(--color-warning-strong)] flex items-center justify-center mb-3">
                            <ExclamationIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Discrepancias Reportadas</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-warning-strong">{DISCREPANCIES.length}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Requieren revisión manual</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] flex items-center justify-center mb-3">
                            <CheckIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Precisión del Inventario</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-success-strong">99.4%</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Objetivo: {">99.5%"}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Asignación de bodega */}
                <section className="rounded-2xl border p-5" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Ventas Listas para Asignación</h2>
                    <ul className="space-y-3">
                        {PENDING_ALLOCATIONS.map(alloc => (
                            <li key={alloc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-transparent hover:border-[var(--color-border-default)] transition-colors" style={{ background: "var(--color-surface-hover)" }}>
                                <div>
                                    <h4 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{alloc.client}</h4>
                                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                                        {alloc.id} • {alloc.size} ({alloc.type})
                                    </p>
                                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs" style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)" }}>{alloc.status}</span>
                                </div>
                                <Button variant="outline" size="sm" className="mt-3 sm:mt-0 text-brand-strong border-brand-light hover:bg-brand-subtle">
                                    Asignar Espacio
                                </Button>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Discrepancias */}
                <section className="rounded-2xl border p-5" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-danger-strong)" }}>
                        <ExclamationIcon />
                        Discrepancias de Auditoría
                    </h2>
                    <ul className="space-y-3">
                        {DISCREPANCIES.map(disc => (
                            <li key={disc.id} className="p-4 rounded-xl border border-transparent hover:border-[var(--color-border-default)] transition-colors" style={{ background: "var(--color-surface-hover)" }}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{disc.sector}</h4>
                                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{disc.date}</span>
                                </div>
                                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{disc.issue}</p>
                                <div className="mt-3 flex gap-2">
                                    <Button variant="outline" size="sm" className="text-xs h-7">Investigar</Button>
                                    <Button variant="outline" size="sm" className="text-xs h-7 hover:bg-[var(--color-success-subtle)] hover:text-[var(--color-success-strong)] hover:border-[var(--color-success-strong)]">Reconciliar</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
