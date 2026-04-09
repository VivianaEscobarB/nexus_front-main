"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { isBusinessProcessVisible } from "@/shared/config/processVisibility";

function ShieldIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M3 6.75 12 3l9 3.75v5.625c0 4.97-3.108 9.407-7.8 11.125L12 21.75l-1.2-.6C6.108 19.532 3 15.095 3 10.125V6.75Z" /></svg>;
}

function UsersIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.742-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.964-1.584A6.062 6.062 0 0 1 6 18.75m12 0a5.971 5.971 0 0 0-.94-3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>;
}

function WarehouseIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m16.5 0V4.875c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125V7.5m16.5 0h-16.5" /></svg>;
}

function AdminActionCard({
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
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                {icon}
            </div>
            <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
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

export function AdminDashboard() {
    const activeProcesses = [
        isBusinessProcessVisible("authentication")
            ? "Acceso y seguridad"
            : null,
        isBusinessProcessVisible("userManagement")
            ? "Gestión de usuarios"
            : null,
        isBusinessProcessVisible("warehouseStructure")
            ? "Infraestructura de bodegas"
            : null,
        isBusinessProcessVisible("clientManagement")
            ? "Gestión de clientes"
            : null,
    ].filter(Boolean);

    return (
        <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-strong)]">
                            <ShieldIcon />
                            Administración
                        </div>
                        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                            Panel administrativo
                        </h1>
                        <p className="mt-3 text-base leading-7 text-[var(--color-text-secondary)]">
                            Administra usuarios, clientes e infraestructura desde un solo lugar.
                        </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--color-surface-hover)] px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                        <p className="font-semibold text-[var(--color-text-primary)]">
                            Módulos disponibles
                        </p>
                        <ul className="mt-2 space-y-1">
                            {activeProcesses.map((process) => (
                                <li key={process}>{process}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
                {isBusinessProcessVisible("userManagement") ? (
                    <AdminActionCard
                        title="Gestión de usuarios"
                        description="Crea, edita, activa o desactiva usuarios según las necesidades de tu operación."
                        href="/dashboard/users"
                        cta="Abrir usuarios"
                        icon={<UsersIcon />}
                    />
                ) : null}
                {isBusinessProcessVisible("warehouseStructure") ? (
                    <AdminActionCard
                        title="Infraestructura de bodegas"
                        description="Organiza bodegas, sectores y espacios para mantener la operación actualizada."
                        href="/dashboard/infrastructure"
                        cta="Abrir infraestructura"
                        icon={<WarehouseIcon />}
                    />
                ) : null}
            </section>
        </div>
    );
}
