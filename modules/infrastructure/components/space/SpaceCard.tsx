import { Card, Badge, Button } from "@/components/ui";
import React from "react";
import type { ManagedSpace } from "@/modules/infrastructure/api/infrastructureTypes";
import {
    formatCapacity,
    getStatusLabel,
    STATUS_VARIANTS,
} from "../utils";

interface SpaceCardProps {
    space: ManagedSpace;
    canManageStructure: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export function SpaceCard({
    space,
    canManageStructure,
    onEdit,
    onDelete,
}: SpaceCardProps) {
    return (
        <Card
            variant="default"
            className="border border-[var(--color-border-subtle)]"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                            {space.name}
                        </h3>
                        <Badge label={space.code} variant="brand" />
                        <Badge
                            label={getStatusLabel(space.status)}
                            variant={STATUS_VARIANTS[space.status]}
                        />
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {space.description || "Sin descripcion operativa"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
                        <span>
                            Sector: {space.sectorName || "Sin referencia"}
                        </span>
                        <span>
                            Bodega: {space.warehouseName || "Sin referencia"}
                        </span>
                        <span>
                            Capacidad: {formatCapacity(space.capacityM2)}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canManageStructure ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit()}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => onDelete()}
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
