"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { isBusinessProcessVisible } from "@/shared/config/processVisibility";
import { listUsers } from "@/modules/users";
import { listEntityTypes, listStatusCatalogs } from "@/modules/infrastructure";
import { listRentalUnitsPricing } from "@/modules/sales";

function ShieldIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M3 6.75 12 3l9 3.75v5.625c0 4.97-3.108 9.407-7.8 11.125L12 21.75l-1.2-.6C6.108 19.532 3 15.095 3 10.125V6.75Z" /></svg>;
}

function UsersIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.742-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.964-1.584A6.062 6.062 0 0 1 6 18.75m12 0a5.971 5.971 0 0 0-.94-3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>;
}

function WarehouseIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m16.5 0V4.875c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125V7.5m16.5 0h-16.5" /></svg>;
}

function TagIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
    );
}

function AdminActionCard({
    title,
    description,
    href,
    cta,
    icon,
    ctaVariant = "primary",
    tone = "default",
}: {
    title: string;
    description: string;
    href: string;
    cta: string;
    icon: ReactNode;
    ctaVariant?: "primary" | "secondary" | "outline";
    tone?: "default" | "maintenance";
}) {
    return (
        <div
            className={`rounded-2xl border p-6 shadow-sm ${
                tone === "maintenance"
                    ? "border-[var(--color-border-default)] bg-[var(--color-surface-hover)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]"
            }`}
        >
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
                    <Button variant={ctaVariant}>{cta}</Button>
                </Link>
            </div>
        </div>
    );
}

function KpiCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string | number;
    hint: string;
}) {
    return (
        <Card variant="default" padding="none" className="rounded-xl">
            <CardBody className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
                    {value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{hint}</p>
            </CardBody>
        </Card>
    );
}

export function AdminDashboard() {
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);
    const [stats, setStats] = React.useState({
        users: 0,
        entityTypes: 0,
        statuses: 0,
        activePricing: 0,
    });

    React.useEffect(() => {
        let isMounted = true;

        const loadStats = async () => {
            setIsLoadingStats(true);
            try {
                const [users, entityTypes, statuses, pricingRows] = await Promise.all([
                    listUsers(),
                    listEntityTypes(),
                    listStatusCatalogs(),
                    listRentalUnitsPricing(),
                ]);

                if (!isMounted) return;

                setStats({
                    users: users.length,
                    entityTypes: entityTypes.length,
                    statuses: statuses.length,
                    activePricing: pricingRows.filter((row) => row.priceActive).length,
                });
            } catch {
                if (!isMounted) return;
                setStats({
                    users: 0,
                    entityTypes: 0,
                    statuses: 0,
                    activePricing: 0,
                });
            } finally {
                if (isMounted) {
                    setIsLoadingStats(false);
                }
            }
        };

        void loadStats();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-strong)]">
                            <ShieldIcon />
                            Administración
                        </div>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Panel administrativo
                        </h1>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                            Gestiona operación base, configuración comercial y mantenimiento del catálogo.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isBusinessProcessVisible("userManagement") ? (
                            <Link href="/dashboard/users">
                                <Button variant="secondary" size="sm">
                                    Gestionar usuarios
                                </Button>
                            </Link>
                        ) : null}
                        {isBusinessProcessVisible("warehouseStructure") ? (
                            <Link href="/dashboard/infrastructure">
                                <Button variant="secondary" size="sm">
                                    Gestionar infraestructura
                                </Button>
                            </Link>
                        ) : null}
                        {isBusinessProcessVisible("contracts") ? (
                            <Link href="/dashboard/sales/commercial-pricing">
                                <Button variant="primary" size="sm">
                                    Configurar precios
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="Usuarios"
                    value={isLoadingStats ? "..." : stats.users}
                    hint="Cuentas registradas en el sistema"
                />
                <KpiCard
                    label="Tipos de entidad"
                    value={isLoadingStats ? "..." : stats.entityTypes}
                    hint="Estructuras con catálogo de estados"
                />
                <KpiCard
                    label="Estados"
                    value={isLoadingStats ? "..." : stats.statuses}
                    hint="Estados disponibles en catálogo maestro"
                />
                <KpiCard
                    label="Precios activos"
                    value={isLoadingStats ? "..." : stats.activePricing}
                    hint="Unidades comercialmente activas"
                />
            </section>

            {isBusinessProcessVisible("userManagement") ||
            isBusinessProcessVisible("warehouseStructure") ? (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            Operación base
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Módulos de uso frecuente para administración diaria.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        {isBusinessProcessVisible("userManagement") ? (
                            <AdminActionCard
                                title="Gestión de usuarios"
                                description="Crea, edita, activa o desactiva usuarios según las necesidades de tu operación."
                                href="/dashboard/users"
                                cta="Gestionar usuarios"
                                icon={<UsersIcon />}
                                ctaVariant="primary"
                            />
                        ) : null}
                        {isBusinessProcessVisible("warehouseStructure") ? (
                            <AdminActionCard
                                title="Infraestructura de bodegas"
                                description="Organiza bodegas, sectores y espacios para mantener la operación actualizada."
                                href="/dashboard/infrastructure"
                                cta="Gestionar infraestructura"
                                icon={<WarehouseIcon />}
                                ctaVariant="primary"
                            />
                        ) : null}
                    </div>
                </section>
            ) : null}

            {isBusinessProcessVisible("contracts") ? (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            Comercial
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Configuración central de precios y estado comercial.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <AdminActionCard
                            title="Parametrización comercial"
                            description="Asigna precio base, moneda y estado comercial a cada unidad de arrendamiento del catálogo."
                            href="/dashboard/sales/commercial-pricing"
                            cta="Gestionar parametrización"
                            icon={<TagIcon />}
                            ctaVariant="primary"
                        />
                    </div>
                </section>
            ) : null}

        </div>
    );
}
