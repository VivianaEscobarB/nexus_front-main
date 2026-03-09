"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

function ViewIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
}

function ReadOnlyCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                <ViewIcon />
            </div>
            <h2 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">
                {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {description}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Solo lectura
            </p>
        </div>
    );
}

export function UserDashboard() {
    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Consulta operativa de estructura
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
                    Como operador de bodega puedes navegar la estructura completa para ubicar bodegas, sectores y espacios disponibles, sin realizar cambios estructurales.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/infrastructure">
                        <Button variant="primary">Consultar estructura</Button>
                    </Link>
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-3">
                <ReadOnlyCard
                    title="Bodegas"
                    description="Ubica rapidamente las bodegas activas y su configuracion general."
                />
                <ReadOnlyCard
                    title="Sectores"
                    description="Consulta la organizacion interna por sectores para entender la distribucion operativa."
                />
                <ReadOnlyCard
                    title="Espacios"
                    description="Visualiza espacios y su estado sin habilitar acciones de creacion o edicion."
                />
            </section>
        </div>
    );
}
