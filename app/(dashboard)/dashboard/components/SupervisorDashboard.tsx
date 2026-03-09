"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

function LayersIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 1.5 9 12 15l10.5-6L12 3Zm0 12L1.5 9m10.5 6 10.5-6M3 13.5 12 18l9-4.5" /></svg>;
}

function SectionCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-brand-strong)]">
                <LayersIcon />
            </div>
            <h2 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">
                {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {description}
            </p>
        </div>
    );
}

export function SupervisorDashboard() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    Operacion estructural de bodega
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
                    Tu alcance en este sprint se concentra en la estructura interna: puedes consultar bodegas y administrar sectores y espacios, sin modificar datos principales de la bodega ni gestionar usuarios.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/infrastructure">
                        <Button variant="primary">Ir a estructura interna</Button>
                    </Link>
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-3">
                <SectionCard
                    title="Consultar bodegas"
                    description="Revisa la estructura disponible y selecciona la bodega sobre la que vas a operar."
                />
                <SectionCard
                    title="Gestionar sectores"
                    description="Crea, ajusta o retira sectores segun la organizacion interna de la instalacion."
                />
                <SectionCard
                    title="Gestionar espacios"
                    description="Administra el detalle operativo de espacios y su estado dentro de cada sector."
                />
            </section>
        </div>
    );
}
