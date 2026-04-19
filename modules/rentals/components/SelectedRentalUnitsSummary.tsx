import React from "react";
import type { RentalUnit } from "../types/rentalUnit.types";

function formatAreaM2(value: number | null): string {
    if (value == null || !Number.isFinite(value) || value <= 0) return "—";
    return `${value.toLocaleString("es-CO", { maximumFractionDigits: 2 })} m²`;
}

function statusLabel(status: RentalUnit["availabilityStatus"]): string {
    switch (status) {
        case "AVAILABLE":
            return "Disponible";
        case "OCCUPIED":
            return "Reservado";
        default:
            return "No disponible";
    }
}

export function SelectedRentalUnitsSummary({ units }: { units: RentalUnit[] }) {
    if (units.length === 0) return null;

    return (
        <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-hover)]/40 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Resumen de unidades seleccionadas
            </p>
            <ul className="space-y-4">
                {units.map(unit => {
                    const title =
                        unit.displaySummary?.trim() ||
                        [unit.warehouse?.name, unit.sector?.code, unit.storageSpace?.code]
                            .filter(Boolean)
                            .join(" · ") ||
                        `Unidad #${unit.id}`;

                    return (
                        <li
                            key={unit.id}
                            className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-4 text-sm shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <div>
                                    <p className="font-semibold text-[var(--color-text-primary)]">{title}</p>
                                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                                        {unit.entityType?.name?.trim() || "Unidad de arrendamiento"}
                                        {" · "}
                                        <span className="font-mono">ID {unit.id}</span>
                                    </p>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] border border-[var(--color-success-default)]/30">
                                    {statusLabel(unit.availabilityStatus)}
                                </span>
                            </div>

                            <dl className="grid gap-2 text-xs sm:grid-cols-2">
                                <div>
                                    <dt className="text-[var(--color-text-tertiary)]">Bodega</dt>
                                    <dd className="font-medium text-[var(--color-text-primary)]">
                                        {unit.warehouse?.name?.trim() || "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[var(--color-text-tertiary)]">Sector</dt>
                                    <dd className="font-medium text-[var(--color-text-primary)]">
                                        {unit.sector?.code?.trim() || "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[var(--color-text-tertiary)]">Espacio</dt>
                                    <dd className="font-medium text-[var(--color-text-primary)]">
                                        {unit.storageSpace?.code?.trim() || "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[var(--color-text-tertiary)]">Área</dt>
                                    <dd className="font-medium text-[var(--color-text-primary)] tabular-nums">
                                        {formatAreaM2(unit.availableAreaM2)}
                                    </dd>
                                </div>
                                {(unit.addressLine?.trim() ||
                                    unit.cityLine?.trim() ||
                                    unit.warehouse?.address?.trim() ||
                                    unit.warehouse?.cityName?.trim()) && (
                                    <div className="sm:col-span-2 pt-2 border-t border-[var(--color-border-subtle)]">
                                        <dt className="text-[var(--color-text-tertiary)] mb-1">Ubicación / detalle</dt>
                                        <dd className="text-[var(--color-text-primary)] leading-relaxed">
                                            {(unit.addressLine?.trim() || unit.warehouse?.address?.trim()) && (
                                                <span className="block">
                                                    {unit.addressLine?.trim() || unit.warehouse?.address?.trim()}
                                                </span>
                                            )}
                                            {(unit.cityLine?.trim() || unit.warehouse?.cityName?.trim()) && (
                                                <span className="block text-[var(--color-text-secondary)]">
                                                    {unit.cityLine?.trim() || unit.warehouse?.cityName?.trim()}
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                )}
                                {unit.warehouse?.typeName?.trim() && (
                                    <div>
                                        <dt className="text-[var(--color-text-tertiary)]">Tipo de bodega</dt>
                                        <dd className="font-medium text-[var(--color-text-primary)]">
                                            {unit.warehouse.typeName}
                                        </dd>
                                    </div>
                                )}
                                {unit.entityType?.description?.trim() && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-[var(--color-text-tertiary)]">Descripción del tipo</dt>
                                        <dd className="text-[var(--color-text-secondary)] mt-0.5">
                                            {unit.entityType.description}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
