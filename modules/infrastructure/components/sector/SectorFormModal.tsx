import { Modal, Button, Input, Select } from "@/components/ui";
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextareaField } from "../ui/TextareaField";
import { toOptionalNumber } from "../utils";
import type { CrudMode } from "../types";
import type {
    ManagedSector,
    ManagedWarehouse,
    CreateSectorInput,
    UpdateSectorInput,
} from "@/modules/infrastructure/api/infrastructureTypes";

export const SECTOR_STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
] as const;

export const optionalNumberField = z
    .number()
    .min(0, "El valor no puede ser negativo")
    .optional();

export const sectorSchema = z.object({
    warehouseId: z.string().min(1, "Selecciona una bodega"),
    code: z.string().min(2, "El codigo debe tener al menos 2 caracteres"),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    capacityM2: optionalNumberField,
    status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

export type SectorFormValues = z.infer<typeof sectorSchema>;

interface SectorFormModalProps {
    isOpen: boolean;
    mode: CrudMode;
    sector?: ManagedSector;
    warehouses: ManagedWarehouse[];
    defaultWarehouseId: string | null;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (values: CreateSectorInput | UpdateSectorInput) => Promise<void>;
}

export function SectorFormModal({
    isOpen,
    mode,
    sector,
    warehouses,
    defaultWarehouseId,
    isSubmitting,
    actionError,
    onClose,
    onSubmit,
}: SectorFormModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<SectorFormValues>({
        resolver: zodResolver(sectorSchema),
        mode: "onChange",
        defaultValues: {
            warehouseId: sector?.warehouseId || defaultWarehouseId || "",
            code: sector?.code ?? "",
            name: sector?.name ?? "",
            description: sector?.description ?? "",
            capacityM2: sector?.capacityM2 ?? undefined,
            status:
                sector?.status === "INACTIVE" || sector?.status === "MAINTENANCE"
                    ? sector.status
                    : "ACTIVE",
        },
    });

    React.useEffect(() => {
        reset({
            warehouseId: sector?.warehouseId || defaultWarehouseId || "",
            code: sector?.code ?? "",
            name: sector?.name ?? "",
            description: sector?.description ?? "",
            capacityM2: sector?.capacityM2 ?? undefined,
            status:
                sector?.status === "INACTIVE" || sector?.status === "MAINTENANCE"
                    ? sector.status
                    : "ACTIVE",
        });
    }, [defaultWarehouseId, reset, sector]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === "create" ? "Nuevo sector" : "Editar sector"}
            description="Asigna sectores a una bodega existente."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="sector-form"
                        isLoading={isSubmitting}
                        disabled={!isValid}
                    >
                        {mode === "create" ? "Crear sector" : "Guardar cambios"}
                    </Button>
                </>
            }
        >
            <form
                id="sector-form"
                className="space-y-5"
                onSubmit={handleSubmit(async (values) => {
                    await onSubmit({
                        ...values,
                        description: values.description?.trim() || undefined,
                    });
                })}
            >
                {actionError ? (
                    <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]">
                        {actionError}
                    </div>
                ) : null}
                <Select
                    label="Bodega"
                    options={warehouses.map((warehouse) => ({
                        value: warehouse.id,
                        label: `${warehouse.code} - ${warehouse.name}`,
                    }))}
                    error={errors.warehouseId?.message}
                    {...register("warehouseId")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Codigo"
                        error={errors.code?.message}
                        {...register("code")}
                    />
                    <Input
                        label="Nombre"
                        error={errors.name?.message}
                        {...register("name")}
                    />
                </div>
                <TextareaField
                    label="Descripcion"
                    error={errors.description?.message}
                    {...register("description")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        label="Capacidad (m2)"
                        error={errors.capacityM2?.message}
                        {...register("capacityM2", {
                            setValueAs: toOptionalNumber,
                        })}
                    />
                    <Select
                        label="Estado"
                        options={[...SECTOR_STATUS_OPTIONS]}
                        error={errors.status?.message}
                        {...register("status")}
                    />
                </div>
            </form>
        </Modal>
    );
}
