import { Card, CardHeader, CardBody, Button } from "@/components/ui";
import React from "react";
import { EmptyState } from "../ui/EmptyState";
import { SectorCard } from "./SectorCard";
import type { ManagedSector, ManagedWarehouse } from "@/modules/infrastructure/api/infrastructureTypes";

interface SectorListProps {
    sectors: ManagedSector[];
    selectedSectorId: string | null;
    selectedWarehouse: ManagedWarehouse | null;
    canManageStructure: boolean;
    onSelect: (sectorId: string) => void;
    onCreate: () => void;
    onEdit: (sector: ManagedSector) => void;
    onDelete: (sector: ManagedSector) => void;
}

export function SectorList({
    sectors,
    selectedSectorId,
    selectedWarehouse,
    canManageStructure,
    onSelect,
    onCreate,
    onEdit,
    onDelete,
}: SectorListProps) {
    return (
        <Card>
            <CardHeader
                title="Sectores"
                description="Gestiona la segmentacion interna por bodega."
                action={
                    canManageStructure ? (
                        <Button
                            size="sm"
                            onClick={onCreate}
                            disabled={!selectedWarehouse}
                        >
                            Nuevo sector
                        </Button>
                    ) : undefined
                }
            />
            <CardBody padding="none" className="space-y-4">
                {sectors.length > 0 ? (
                    sectors.map((sector) => (
                        <SectorCard
                            key={sector.id}
                            sector={sector}
                            isSelected={sector.id === selectedSectorId}
                            canManageStructure={canManageStructure}
                            onSelect={() => onSelect(sector.id)}
                            onEdit={() => onEdit(sector)}
                            onDelete={() => onDelete(sector)}
                        />
                    ))
                ) : (
                    <EmptyState
                        title="No hay sectores para esta bodega"
                        description={
                            selectedWarehouse
                                ? "Crea el primer sector para estructurar esta instalacion."
                                : "Primero selecciona una bodega para gestionar sectores."
                        }
                        action={
                            selectedWarehouse && canManageStructure ? (
                                <Button onClick={onCreate}>Crear sector</Button>
                            ) : undefined
                        }
                    />
                )}
            </CardBody>
        </Card>
    );
}
