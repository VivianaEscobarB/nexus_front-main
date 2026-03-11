import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import * as React from "react";
import { EmptyState } from "../ui/EmptyState";
import { WarehouseCard } from "./WarehouseCard";
import type { ManagedWarehouse } from "@/modules/infrastructure";

interface WarehouseListProps {
    warehouses: ManagedWarehouse[];
    isLoading: boolean;
    pageError: string | null;
    selectedWarehouseId: string | null;
    canManageWarehouses: boolean;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onEdit: (warehouse: ManagedWarehouse) => void;
    onDelete: (warehouse: ManagedWarehouse) => void;
}

export function WarehouseList({
    warehouses,
    isLoading,
    pageError,
    selectedWarehouseId,
    canManageWarehouses,
    onSelect,
    onCreate,
    onEdit,
    onDelete,
}: WarehouseListProps) {
    return (
        <Card>
            <CardHeader
                title="Bodegas operativas"
                description="Administra los centros de distribucion principales."
                action={
                    canManageWarehouses ? (
                        <Button size="sm" onClick={onCreate}>
                            Nueva bodega
                        </Button>
                    ) : undefined
                }
            />
            <CardBody padding="none" className="space-y-4">
                {pageError ? (
                    <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-5 py-4 text-sm text-[var(--color-danger-strong)]">
                        <strong className="block font-semibold">
                            Error al cargar bodegas
                        </strong>
                        <span className="mt-1 block">{pageError}</span>
                    </div>
                ) : isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface-hover)]"
                        />
                    ))
                ) : warehouses.length > 0 ? (
                    warehouses.map((warehouse) => (
                        <WarehouseCard
                            key={warehouse.id}
                            warehouse={warehouse}
                            isSelected={warehouse.id === selectedWarehouseId}
                            canManageWarehouses={canManageWarehouses}
                            onClick={() => onSelect(warehouse.id)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))
                ) : (
                    <EmptyState
                        title="No hay bodegas registradas"
                        description="Crea la primera bodega para empezar a modelar sectores y espacios."
                        action={
                            canManageWarehouses ? (
                                <Button onClick={onCreate}>Crear bodega</Button>
                            ) : undefined
                        }
                    />
                )}
            </CardBody>
        </Card>
    );
}
