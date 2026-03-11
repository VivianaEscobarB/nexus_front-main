import { Card, CardHeader, CardBody, Button } from "@/components/ui";
import React from "react";
import { EmptyState } from "../ui/EmptyState";
import { SpaceCard } from "./SpaceCard";
import type {
    ManagedSpace,
    ManagedSector,
    ManagedWarehouse,
} from "@/modules/infrastructure/api/infrastructureTypes";

interface SpaceListProps {
    spaces: ManagedSpace[];
    selectedWarehouse: ManagedWarehouse | null;
    selectedSector: ManagedSector | null;
    showsSectorPanel: boolean;
    isClientViewer: boolean;
    canManageStructure: boolean;
    onCreate: () => void;
    onEdit: (space: ManagedSpace) => void;
    onDelete: (space: ManagedSpace) => void;
}

export function SpaceList({
    spaces,
    selectedWarehouse,
    selectedSector,
    showsSectorPanel,
    isClientViewer,
    canManageStructure,
    onCreate,
    onEdit,
    onDelete,
}: SpaceListProps) {
    return (
        <Card>
            <CardHeader
                title="Espacios"
                description={
                    isClientViewer
                        ? "Consulta espacios disponibles dentro de la bodega seleccionada."
                        : "Administra la ocupacion fina de cada sector."
                }
                action={
                    canManageStructure ? (
                        <Button
                            size="sm"
                            onClick={onCreate}
                            disabled={!selectedWarehouse || !selectedSector}
                        >
                            Nuevo espacio
                        </Button>
                    ) : undefined
                }
            />
            <CardBody padding="none" className="space-y-4">
                {showsSectorPanel && selectedSector ? (
                    <div className="rounded-2xl bg-[var(--color-surface-hover)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        Trabajando sobre el sector{" "}
                        <strong className="text-[var(--color-text-primary)]">
                            {selectedSector.name}
                        </strong>
                        {selectedWarehouse ? ` de ${selectedWarehouse.name}` : ""}
                        .
                    </div>
                ) : null}

                {spaces.length > 0 ? (
                    spaces.map((space) => (
                        <SpaceCard
                            key={space.id}
                            space={space}
                            canManageStructure={canManageStructure}
                            onEdit={() => onEdit(space)}
                            onDelete={() => onDelete(space)}
                        />
                    ))
                ) : (
                    <EmptyState
                        title="No hay espacios en este contexto"
                        description="Ajusta tu seleccion de bodega/sector o crea nuevos espacios."
                        action={
                            selectedWarehouse &&
                            selectedSector &&
                            canManageStructure ? (
                                <Button onClick={onCreate}>
                                    Crear espacio
                                </Button>
                            ) : undefined
                        }
                    />
                )}
            </CardBody>
        </Card>
    );
}
