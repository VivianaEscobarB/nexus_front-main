"use client";

import React from "react";
import type { RentalUnitAvailabilityStatus } from "@/modules/sales";
import type { RentalUnit } from "../types/rentalUnit.types";
import { useWarehouseCatalogCard } from "../hooks/useWarehouseCatalogCard";

interface RentalUnitCardProps {
    unit: RentalUnit;
    isSelected: boolean;
    /** Acción al elegir o quitar la unidad */
    onSelect: () => void;
}

function getEntityChipStyle(entityName: string): { color: string; bg: string } {
    const u = entityName.toUpperCase();
    if (u.includes("WAREHOUSE") || u.includes("BODEGA")) {
        return { color: "var(--color-brand-strong)", bg: "var(--color-brand-subtle)" };
    }
    if (u.includes("SECTOR")) {
        return { color: "var(--color-info-strong)", bg: "var(--color-info-subtle)" };
    }
    return { color: "var(--color-success-strong)", bg: "var(--color-success-subtle)" };
}

function getAvailabilityPresentation(status: RentalUnitAvailabilityStatus): {
    label: string;
    badgeClass: string;
} {
    switch (status) {
        case "AVAILABLE":
            return {
                label: "Disponible",
                badgeClass:
                    "bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] " +
                    "border border-[var(--color-success-default)]/35",
            };
        case "OCCUPIED":
            return {
                label: "Reservado",
                badgeClass:
                    "bg-[var(--color-warning-subtle)] text-[var(--color-warning-strong)] " +
                    "border border-[var(--color-warning-default)]/35",
            };
        default:
            return {
                label: "No disponible",
                badgeClass:
                    "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] " +
                    "border border-[var(--color-border-default)]",
            };
    }
}

function formatAreaM2(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value) || value <= 0) return "—";
    return `${value.toLocaleString("es-CO", { maximumFractionDigits: 2 })} m²`;
}

function locationLine(label: string, value: string) {
    return (
        <div className="flex justify-between gap-3 text-sm">
            <span className="text-[var(--color-text-tertiary)] shrink-0">{label}</span>
            <span className="font-medium text-[var(--color-text-primary)] text-right truncate" title={value}>
                {value}
            </span>
        </div>
    );
}

export function RentalUnitCard({ unit, isSelected, onSelect }: RentalUnitCardProps) {
    const { data: card, isPending } = useWarehouseCatalogCard(unit);

    const baseEntityName =
        unit.entityType?.name?.trim() ||
        unit.displaySummary?.trim() ||
        `Unidad #${unit.id}`;

    const chipLabel = card?.warehouseTypeName?.trim() || baseEntityName;
    const chip = getEntityChipStyle(chipLabel);
    const availability = getAvailabilityPresentation(unit.availabilityStatus);

    const hasStructuredLocation =
        Boolean(unit.warehouse?.name?.trim() || unit.warehouse?.code?.trim()) ||
        Boolean(unit.sector?.code?.trim()) ||
        Boolean(unit.storageSpace?.code?.trim());

    const warehouseLabel = card?.warehouseName?.trim()
        || card?.warehouseCode?.trim()
        || unit.warehouse?.name?.trim()
        || unit.warehouse?.code?.trim()
        || (!hasStructuredLocation && unit.displaySummary?.trim() ? unit.displaySummary.trim() : "")
        || "—";

    const sectorDisplay = card
        ? `${card.registeredSectorsCount ?? "—"} sect. · ${card.registeredStorageSpacesCount ?? "—"} esp.`
        : unit.sector?.code?.trim() || "—";

    const title =
        card?.unitTitleLabel?.trim()
        || [unit.warehouse?.name, unit.sector?.code, unit.storageSpace?.code].filter(Boolean).join(" · ")
        || unit.displaySummary?.trim()
        || `Unidad #${unit.id}`;

    const areaM2 =
        card?.offeredAreaM2
        ?? card?.totalWarehouseCapacityM2
        ?? unit.availableAreaM2;

    const addressPrimary =
        card?.warehouseLocation?.trim()
        || unit.addressLine?.trim()
        || unit.warehouse?.address?.trim()
        || "";

    const addressCity =
        card?.cityName?.trim()
        || unit.cityLine?.trim()
        || unit.warehouse?.cityName?.trim()
        || "";

    const summaryLine = card?.locationSummaryLine?.trim();

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? "Deseleccionar" : "Seleccionar"} ${title}`}
            className={[
                "relative flex flex-col rounded-xl border-2 transition-all cursor-pointer select-none text-left",
                "p-5 min-h-[220px] shadow-sm",
                isPending ? "opacity-90" : "",
                isSelected
                    ? "border-[var(--color-success-default)] bg-[var(--color-success-subtle)] " +
                      "shadow-md ring-2 ring-[var(--color-success-default)]/30 ring-offset-1 ring-offset-[var(--color-surface-base)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] " +
                      "hover:border-[var(--color-border-default)] hover:shadow-md",
            ].filter(Boolean).join(" ")}
        >
            {isSelected && (
                <div
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--color-success-strong)] flex items-center justify-center shadow"
                    aria-hidden
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            <header className="pr-10 mb-3 flex flex-wrap items-start gap-2">
                <span
                    className="inline-block text-[10px] uppercase font-bold tracking-wide px-2.5 py-1 rounded-md"
                    style={{ color: chip.color, backgroundColor: chip.bg }}
                >
                    {chipLabel}
                </span>
                {card?.offerScope && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border border-[var(--color-border-default)] text-[var(--color-text-tertiary)]">
                        {card.offerScope}
                    </span>
                )}
                {unit.displaySummary?.trim()
                    && unit.displaySummary.trim() !== card?.warehouseName?.trim()
                    && unit.displaySummary.trim() !== unit.warehouse?.name?.trim() && (
                    <p className="w-full mt-1 text-sm font-medium text-[var(--color-text-primary)] leading-snug line-clamp-2 pr-2">
                        {unit.displaySummary.trim()}
                    </p>
                )}
                {card?.unitTitleLabel?.trim() && card.unitTitleLabel.trim() !== unit.displaySummary?.trim() && (
                    <p className="w-full text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 pr-2">
                        {card.unitTitleLabel.trim()}
                    </p>
                )}
            </header>

            <section className="space-y-2 mb-4 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                    Ubicación
                </p>
                <div className="space-y-1.5">
                    {locationLine("Bodega", warehouseLabel)}
                    {card ? (
                        locationLine("Inventario bajo bodega", sectorDisplay)
                    ) : (
                        <>
                            {locationLine("Sector", sectorDisplay)}
                            {locationLine("Espacio", unit.storageSpace?.code?.trim() || "—")}
                        </>
                    )}
                </div>
                {(addressPrimary || addressCity || summaryLine) && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed border-t border-[var(--color-border-subtle)] pt-2">
                        {addressPrimary}
                        {addressPrimary && (addressCity || summaryLine) ? " · " : ""}
                        {addressCity}
                        {summaryLine && (
                            <>
                                {(addressPrimary || addressCity) ? <span className="block mt-1">{summaryLine}</span> : summaryLine}
                            </>
                        )}
                    </p>
                )}
            </section>

            <section className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">
                    Información
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatAreaM2(areaM2)}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                    {card ? "Área ofrecida (bodega completa)" : "Área disponible"}
                </p>
                {!card && unit.warehouse?.typeName?.trim() && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                        Tipo de bodega: <span className="font-medium">{unit.warehouse.typeName}</span>
                    </p>
                )}
                {card?.warehouseTypeDescription?.trim() && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                        {card.warehouseTypeDescription}
                    </p>
                )}
                {!card && (unit.warehouse?.totalCapacityM2 != null && unit.warehouse.totalCapacityM2 > 0) && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        Capacidad total bodega:{" "}
                        <span className="font-medium tabular-nums text-[var(--color-text-secondary)]">
                            {unit.warehouse.totalCapacityM2.toLocaleString("es-CO", { maximumFractionDigits: 2 })} m²
                        </span>
                    </p>
                )}
            </section>

            <footer className="mt-auto pt-3 border-t border-[var(--color-border-subtle)] flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                        Estado
                    </span>
                    <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${availability.badgeClass}`}
                    >
                        {availability.label}
                    </span>
                </div>
                {card?.warehouseStatusDescription?.trim() && (
                    <p className="text-[10px] text-[var(--color-text-secondary)] text-right leading-snug">
                        Catálogo: {card.warehouseStatusDescription}
                    </p>
                )}
            </footer>

            <div
                className={[
                    "mt-3 pt-2 text-center text-xs font-medium transition-colors",
                    isSelected
                        ? "text-[var(--color-success-strong)]"
                        : "text-[var(--color-text-tertiary)]",
                ].join(" ")}
            >
                {isSelected ? "Seleccionada · clic para quitar" : "Clic para seleccionar"}
            </div>
        </div>
    );
}
