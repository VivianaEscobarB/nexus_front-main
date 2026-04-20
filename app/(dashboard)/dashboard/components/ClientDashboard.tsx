"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

function WarehouseIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m16.5 0V4.875c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125V7.5m16.5 0h-16.5" /></svg>;
}

function MoneyIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>;
}

export function ClientDashboard() {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Mis bodegas
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
                    Bienvenido, {user?.first_name || "cliente"}. Revisa las bodegas y unidades que tienes asociadas por tus contratos activos.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/my-inventory">
                        <Button variant="primary">Ver mis bodegas</Button>
                    </Link>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                    <WarehouseIcon />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
                    Activos contratados
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Consulta las unidades que ya quedaron activas para tu cuenta cliente.
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    Mis activos
                </p>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                    <MoneyIcon />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
                    Mis contratos y pagos
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Revisa tus contratos, registra pagos y confirma cuándo pasan a estado ACTIVE.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/client/contracts">
                        <Button variant="primary">Ir a contratos y pagos</Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
