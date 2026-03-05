"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function ChartPieIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>; }
function CurrencyDollarIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>; }
function DocumentTextIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }

const PENDING_CONTRACTS = [
    { id: "CT-901", client: "Mega Foods SA", amount: "$1,200/mes", step: "A la espera de pago (Link enviado)" },
    { id: "CT-903", client: "ElectroMundo", amount: "$3,500/mes", step: "Contrato enviado (Firma digital)" },
];

export function SalesDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Gestión Comercial y Ventas
                    </h1>
                    <p className="mt-1 text-lg" style={{ color: "var(--color-text-tertiary)" }}>
                        Generación de contratos, pagos y consulta de disponibilidad de m².
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="primary" size="md" className="gap-2">
                        + Nueva Oferta
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Disponibilidad M2 */}
                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-brand-light)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] flex items-center justify-center mb-3">
                            <ChartPieIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Capacidad Comercial Disponible</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-[var(--color-text-primary)]">1,250 <span className="text-2xl font-normal text-[var(--color-text-tertiary)]">m²</span></p>
                        <p className="text-xs mt-1 text-[var(--color-success-strong)]">Ideal para clientes nuevos</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-subtle)] text-[var(--color-warning-strong)] flex items-center justify-center mb-3">
                            <DocumentTextIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Contratos en Tránsito</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-[var(--color-text-primary)]">5</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>Faltan firmas o pagos</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border flex flex-col justify-between" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] flex items-center justify-center mb-3">
                            <CurrencyDollarIcon />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Cierres de Mes</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold text-[var(--color-text-primary)]">12</p>
                        <p className="text-xs mt-1 text-[var(--color-text-tertiary)]">+3 vs mes anterior</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pipeline / En proceso */}
                <section className="rounded-2xl border p-5" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Asignación de Pasarelas y Firmas</h2>
                    <ul className="space-y-3">
                        {PENDING_CONTRACTS.map(contract => (
                            <li key={contract.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-transparent hover:border-[var(--color-border-default)] transition-colors" style={{ background: "var(--color-surface-hover)" }}>
                                <div>
                                    <h4 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{contract.client}</h4>
                                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                                        {contract.id} • {contract.amount}
                                    </p>
                                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide font-medium" style={{ background: "var(--color-warning-subtle)", color: "var(--color-warning-strong)" }}>{contract.step}</span>
                                </div>
                                <div className="mt-3 sm:mt-0 flex gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                                        Re-enviar
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 border-brand-light text-brand-strong hover:bg-brand-subtle">
                                        Verificar Pay
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="col-span-1 space-y-4">
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Accesos Rápidos</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/dashboard/sales/contracts/create" className="group rounded-2xl border p-5 flex flex-col items-center justify-center text-center hover:border-[var(--color-primary-default)] transition-colors" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary-default)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <DocumentTextIcon />
                            </div>
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">Nuevo Contrato</span>
                        </Link>

                        <Link href="/dashboard/sales/catalog" className="group rounded-2xl border p-5 flex flex-col items-center justify-center text-center hover:border-[var(--color-primary-default)] transition-colors" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                            <div className="w-12 h-12 rounded-full bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ChartPieIcon />
                            </div>
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">Ver Catálogo</span>
                        </Link>

                        <Link href="/dashboard/clients/create" className="group rounded-2xl border p-5 flex flex-col items-center justify-center text-center col-span-2 hover:border-[var(--color-primary-default)] transition-colors" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                            <div className="w-10 h-10 rounded-full bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                            </div>
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">Registrar Cliente Rápido</span>
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
