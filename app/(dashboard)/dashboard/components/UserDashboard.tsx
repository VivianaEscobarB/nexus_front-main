"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";

const OPERATOR_QUICK_LINKS = [
    {
        href: "/dashboard/operador/recepcion-mercancia",
        title: "Recepción de mercancía",
        description: "Registro formal de vehículo, conductor y documentos de ingreso.",
    },
    {
        href: "/dashboard/operador/recepcion-rf",
        title: "Entrada RF (cámara)",
        description: "Abre recepción, escanea códigos y confirma líneas con el API.",
    },
    {
        href: "/dashboard/operador/movimientos-inventario",
        title: "Movimientos de inventario",
        description: "Entradas, salidas y ajustes con tipos y subtipos del sistema.",
    },
    {
        href: "/dashboard/operador/conteo-inventario-rf",
        title: "Conteo RF (inventario)",
        description: "Crea conteos, registra líneas y cierra el conteo desde piso.",
    },
    {
        href: "/dashboard/consulta-inventario",
        title: "Consulta de inventario",
        description: "Consulta existencias por producto y espacio de almacenamiento.",
    },
    {
        href: "/dashboard/historial-movimientos",
        title: "Historial de movimientos",
        description: "Movimientos recientes del servidor y tabla de ejemplo como referencia.",
    },
] as const;

const STRUCTURE_HINTS = [
    {
        title: "Bodegas",
        description: "Sedes activas y su configuración general para ubicar el trabajo del día.",
    },
    {
        title: "Sectores",
        description: "Zonas dentro de cada bodega para orientar movimientos y conteos.",
    },
    {
        title: "Espacios",
        description: "Ubicaciones puntuales (racks, módulos) alineadas con el inventario.",
    },
] as const;

export function UserDashboard() {
    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <section className="rounded-3xl border border-border-subtle bg-surface-base p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                    Tu día en bodega
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-text-secondary">
                    Entra por recepción o RF, registra movimientos y conteos, y consulta inventario
                    cuando necesites validar existencias. Las ubicaciones físicas las ves en la
                    estructura de bodegas.
                </p>

                <div className="mt-8 border-t border-border-subtle pt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                        Accesos rápidos
                    </h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {OPERATOR_QUICK_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group rounded-2xl border border-border-subtle bg-surface-sunken/35 p-4 transition-colors hover:border-border-default hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
                            >
                                <p className="font-semibold text-text-primary">{item.title}</p>
                                <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
                                <span className="mt-3 inline-flex text-sm font-medium text-brand-strong group-hover:underline">
                                    Ir
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-border-subtle bg-surface-sunken/30 p-5">
                    <h2 className="text-sm font-semibold text-text-primary">Ubicaciones en el sistema</h2>
                    <p className="mt-1 text-sm text-text-secondary">
                        Consulta bodegas, sectores y espacios cuando necesites confirmar dónde
                        registrar un movimiento o un conteo.
                    </p>
                    <div className="mt-4">
                        <Link href="/dashboard/infrastructure">
                            <Button variant="outline">Consultar estructura de bodegas</Button>
                        </Link>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                    Referencia: qué verás en estructura
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {STRUCTURE_HINTS.map((item) => (
                        <div
                            key={item.title}
                            className="rounded-2xl border border-border-subtle bg-surface-base p-5"
                        >
                            <h3 className="text-base font-bold text-text-primary">{item.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
