import { Card, Badge, Button } from "@/components/ui";
import React from "react";
import type { ManagedSector } from "@/modules/infrastructure/api/infrastructureTypes";
import {
    formatCapacity,
    getStatusLabel,
    STATUS_VARIANTS,
} from "../utils";

interface SectorCardProps {
    sector: ManagedSector;
    isSelected: boolean;
    canManageStructure: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function SectorCard({
    sector,
    isSelected,
    canManageStructure,
    onSelect,
    onEdit,
    onDelete,
}: SectorCardProps) {
    return (
        <Card
            clickable
            variant={isSelected ? "outlined" : "default"}
            className={[
                "border",
                isSelected
                    ? "border-[var(--color-brand-strong)] bg-[var(--color-brand-subtle)]"
                    : "border-[var(--color-border-subtle)]",
            ].join(" ")}
            onClick={onSelect}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                            {sector.name}
                        </h3>
                        <Badge label={sector.code} variant="brand" />
                        <Badge
                            label={getStatusLabel(sector.status)}
                            variant={STATUS_VARIANTS[sector.status]}
                        />
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {sector.description || "Sin descripcion operativa"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
                        <span>
                            Bodega: {sector.warehouseName || "Sin referencia"}
                        </span>
                        <span>
                            Capacidad: {formatCapacity(sector.capacityM2)}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canManageStructure ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onEdit();
                                }}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete();
                                }}
                            >
                                Eliminar
                            </Button>
                        </>
                    ) : (
                        <Badge label="Solo lectura" variant="neutral" />
                    )}
                </div>
            </div>
        </Card>
    );
}
