"use client";

import { useQuery } from "@tanstack/react-query";
import { getRentalUnitWarehouseCatalogCard } from "@/modules/sales";
import type { RentalUnit } from "../types/rentalUnit.types";

/**
 * Candidatos a “bodega completa”: tipo bodega en catálogo y sin sector/espacio enlazado.
 * Si el listado no trae entityType bien, el GET catalog-card devolverá 404 y la card usa solo datos del listado.
 */
export function isWarehouseFullCatalogCandidate(unit: RentalUnit): boolean {
    if (!unit?.id || unit.id <= 0) return false;
    const et = (unit.entityType?.name ?? "").toUpperCase();
    const looksWarehouse = et.includes("WAREHOUSE") || et.includes("BODEGA");
    const noSectorOrSpace =
        !unit.sector?.code?.trim() &&
        !unit.storageSpace?.code?.trim();
    return looksWarehouse && noSectorOrSpace;
}

export function useWarehouseCatalogCard(unit: RentalUnit) {
    return useQuery({
        queryKey: ["rental-unit-warehouse-catalog-card", unit.id],
        queryFn: () => getRentalUnitWarehouseCatalogCard(unit.id),
        enabled: isWarehouseFullCatalogCandidate(unit),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: false,
    });
}
