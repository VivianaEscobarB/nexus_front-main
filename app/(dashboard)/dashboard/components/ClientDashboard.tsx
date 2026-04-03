"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

function WarehouseIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m16.5 0V4.875c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125V7.5m16.5 0h-16.5" /></svg>;
}

export function ClientDashboard() {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Consulta de disponibilidad
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
                    Bienvenido, {user?.first_name || "cliente"}. Consulta la disponibilidad de bodegas y espacios de forma rápida y clara.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/my-inventory">
                        <Button variant="primary">Consultar disponibilidad</Button>
                    </Link>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                    <WarehouseIcon />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
                    Consulta de bodegas y espacios
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Revisa la disponibilidad general de bodegas y espacios desde un acceso pensado para consulta.
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    Consulta
                </p>
            </section>
        </div>
    );
}
