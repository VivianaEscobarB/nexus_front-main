import React from "react";
import Link from "next/link";
import type { RentalUnit } from "../types/rentalUnit.types";
import { RentalUnitCard } from "./RentalUnitCard";

interface RentalUnitsCatalogProps {
    units: RentalUnit[];
    isSelected: (unitId: number) => boolean;
    onToggleSelect: (unit: RentalUnit) => void;
}

export function RentalUnitsCatalog({ units, isSelected, onToggleSelect }: RentalUnitsCatalogProps) {
    if (units.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] px-4 py-14 text-center text-[var(--color-text-secondary)]">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                    No hay unidades de arrendamiento disponibles en el inventario.
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6">
                    Las rental units se generan desde la estructura física (bodegas, sectores, espacios) y la
                    sincronización del catálogo; no es el flujo principal crearlas desde un formulario aislado.
                </p>
                <ul className="mx-auto mt-4 max-w-lg list-disc space-y-2 pl-5 text-left text-sm">
                    <li>
                        Cree o actualice una bodega en{" "}
                        <Link href="/dashboard/infrastructure" className="font-semibold text-[var(--color-brand-strong)] underline">
                            Infraestructura
                        </Link>{" "}
                        y espere unos segundos a la sincronización automática.
                    </li>
                    <li>
                        Si hubo datos previos a eventos en tiempo real, un administrador puede usar{" "}
                        <span className="font-semibold text-[var(--color-text-primary)]">
                            Sincronizar con infraestructura
                        </span>{" "}
                        en{" "}
                        <Link href="/dashboard/sales/commercial-pricing" className="font-semibold text-[var(--color-brand-strong)] underline">
                            Parametrización comercial
                        </Link>
                        .
                    </li>
                    <li>
                        Si al formalizar un contrato aparece conflicto por precio, revise{" "}
                        <Link href="/dashboard/sales/commercial-pricing" className="font-semibold text-[var(--color-brand-strong)] underline">
                            Parametrización comercial
                        </Link>
                        .
                    </li>
                    <li>
                        Unidades, precios e IDs:{" "}
                        <Link href="/dashboard/sales/commercial-pricing" className="font-semibold text-[var(--color-brand-strong)] underline">
                            Parametrización comercial
                        </Link>
                        . Consulta operativa (comercial):{" "}
                        <Link href="/dashboard/sales/rental-units" className="font-semibold text-[var(--color-brand-strong)] underline">
                            Unidades de arrendamiento
                        </Link>
                        .
                    </li>
                </ul>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
            {units.map(unit => (
                <RentalUnitCard
                    key={unit.id}
                    unit={unit}
                    isSelected={isSelected(unit.id)}
                    onSelect={() => onToggleSelect(unit)}
                />
            ))}
        </div>
    );
}
