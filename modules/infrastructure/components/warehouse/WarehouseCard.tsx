import { Badge, Button, Card } from "@/components/ui";
import * as React from "react";
import type { ManagedWarehouse } from "@/modules/infrastructure";
import { formatCapacity, getStatusLabel, STATUS_VARIANTS } from "../utils";

interface WarehouseCardProps {
    warehouse: ManagedWarehouse;
    isSelected: boolean;
    canManageWarehouses: boolean;
    onClick: () => void;
    onEdit: (warehouse: ManagedWarehouse) => void;
    onDelete: (warehouse: ManagedWarehouse) => void;
}

export function WarehouseCard({
    warehouse,
    isSelected,
    canManageWarehouses,
    onClick,
    onEdit,
    onDelete,
}: WarehouseCardProps) {
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
            onClick={onClick}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                            {warehouse.name}
                        </h3>
                        <Badge label={warehouse.code} variant="brand" />
                        <Badge
                            label={getStatusLabel(warehouse.status)}
                            variant={STATUS_VARIANTS[warehouse.status]}
                        />
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {warehouse.address}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
                        <span>
                            Total: {formatCapacity(warehouse.totalCapacityM2)}
                        </span>
                        <span>
                            Disponible: {formatCapacity(warehouse.availableCapacityM2)}
                        </span>
                        {warehouse.cityName ? (
                            <span>Ciudad: {warehouse.cityName}</span>
                        ) : null}
                        {warehouse.typeName ? (
                            <span>Tipo: {warehouse.typeName}</span>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canManageWarehouses ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onEdit(warehouse);
                                }}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(warehouse);
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
