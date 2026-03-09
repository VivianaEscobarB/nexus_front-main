"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { isBusinessProcessVisible } from "@/shared/config/processVisibility";

function ClientIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-9.75-1.875a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>;
}

function WarehouseIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m16.5 0V4.875c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125V7.5m16.5 0h-16.5" /></svg>;
}

function SalesActionCard({
    title,
    description,
    href,
    cta,
    icon,
}: {
    title: string;
    description: string;
    href: string;
    cta: string;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                {icon}
            </div>
            <h2 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">
                {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {description}
            </p>
            <div className="mt-6">
                <Link href={href}>
                    <Button variant="primary">{cta}</Button>
                </Link>
            </div>
        </div>
    );
}

export function SalesDashboard() {
    return (
        <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Proceso comercial activo
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
                    En este sprint el rol comercial se concentra en registrar clientes y consultar disponibilidad real de bodegas, sectores y espacios. Los contratos y pagos quedan reservados para el siguiente sprint.
                </p>
            </section>

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {isBusinessProcessVisible("clientManagement") ? (
                    <SalesActionCard
                        title="Registrar cliente"
                        description="Crea la ficha comercial del cliente y deja trazada la necesidad de acceso al portal para administracion."
                        href="/dashboard/clients/create"
                        cta="Registrar cliente"
                        icon={<ClientIcon />}
                    />
                ) : null}
                {isBusinessProcessVisible("clientManagement") ? (
                    <SalesActionCard
                        title="Directorio comercial"
                        description="Consulta clientes ya registrados para seguimiento comercial y preparacion de proximas fases."
                        href="/dashboard/clients"
                        cta="Abrir directorio"
                        icon={<ClientIcon />}
                    />
                ) : null}
                {isBusinessProcessVisible("warehouseStructure") ? (
                    <SalesActionCard
                        title="Disponibilidad detallada"
                        description="Consulta bodegas, sectores y espacios disponibles para orientar la propuesta comercial."
                        href="/dashboard/infrastructure"
                        cta="Ver disponibilidad"
                        icon={<WarehouseIcon />}
                    />
                ) : null}
            </section>
        </div>
    );
}
