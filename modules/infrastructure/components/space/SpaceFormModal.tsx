import { Modal, Button, Input, Select } from "@/components/ui";
import React from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextareaField } from "../ui/TextareaField";
import { toOptionalNumber } from "../utils";
import { optionalNumberField } from "../sector/SectorFormModal";
import type { CrudMode } from "../types";
import type {
    ManagedSpace,
    ManagedSector,
    ManagedWarehouse,
    CreateSpaceInput,
    UpdateSpaceInput,
    InfrastructureStatus,
} from "@/modules/infrastructure/api/infrastructureTypes";

export const SPACE_STATUS_OPTIONS = [
    { value: "AVAILABLE", label: "Disponible" },
    { value: "OCCUPIED", label: "Ocupado" },
    { value: "RESERVED", label: "Reservado" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
    { value: "INACTIVE", label: "Inactivo" },
] as const;

export const spaceSchema = z.object({
    warehouseId: z.string().min(1, "Selecciona una bodega"),
    sectorId: z.string().min(1, "Selecciona un sector"),
    code: z.string().min(2, "El codigo debe tener al menos 2 caracteres"),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    capacityM2: optionalNumberField,
    status: z.enum([
        "AVAILABLE",
        "OCCUPIED",
        "RESERVED",
        "MAINTENANCE",
        "INACTIVE",
    ]),
});

export type SpaceFormValues = z.infer<typeof spaceSchema>;

export function normalizeSpaceStatus(
    value: InfrastructureStatus | undefined
): "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" | "INACTIVE" {
    return value === "OCCUPIED" ||
        value === "RESERVED" ||
        value === "MAINTENANCE" ||
        value === "INACTIVE"
        ? value
        : "AVAILABLE";
}

interface SpaceFormModalProps {
    isOpen: boolean;
    mode: CrudMode;
    space?: ManagedSpace;
    warehouses: ManagedWarehouse[];
    sectors: ManagedSector[];
    defaultWarehouseId: string | null;
    defaultSectorId: string | null;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (values: CreateSpaceInput | UpdateSpaceInput) => Promise<void>;
}

export function SpaceFormModal({
    isOpen,
    mode,
    space,
    warehouses,
    sectors,
    defaultWarehouseId,
    defaultSectorId,
    isSubmitting,
    actionError,
    onClose,
    onSubmit,
}: SpaceFormModalProps) {
    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isValid },
    } = useForm<SpaceFormValues>({
        resolver: zodResolver(spaceSchema),
        mode: "onChange",
        defaultValues: {
            warehouseId: space?.warehouseId || defaultWarehouseId || "",
            sectorId: space?.sectorId || defaultSectorId || "",
            code: space?.code ?? "",
            name: space?.name ?? "",
            description: space?.description ?? "",
            capacityM2: space?.capacityM2 ?? undefined,
            status: normalizeSpaceStatus(space?.status),
        },
    });

    React.useEffect(() => {
        reset({
            warehouseId: space?.warehouseId || defaultWarehouseId || "",
            sectorId: space?.sectorId || defaultSectorId || "",
            code: space?.code ?? "",
            name: space?.name ?? "",
            description: space?.description ?? "",
            capacityM2: space?.capacityM2 ?? undefined,
            status: normalizeSpaceStatus(space?.status),
        });
    }, [defaultSectorId, defaultWarehouseId, reset, space]);

    const watchedWarehouseId = useWatch({ control, name: "warehouseId" });
    const watchedSectorId = useWatch({ control, name: "sectorId" });

    const availableSectors = React.useMemo(() => {
        return sectors.filter((sector) => sector.warehouseId === watchedWarehouseId);
    }, [sectors, watchedWarehouseId]);

    React.useEffect(() => {
        if (!availableSectors.some((sector) => sector.id === watchedSectorId)) {
            setValue("sectorId", "");
        }
    }, [availableSectors, setValue, watchedSectorId]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === "create" ? "Nuevo espacio" : "Editar espacio"}
            description="Crea o ajusta espacios dentro de un sector."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="space-form"
                        isLoading={isSubmitting}
                        disabled={!isValid}
                    >
                        {mode === "create" ? "Crear espacio" : "Guardar cambios"}
                    </Button>
                </>
            }
        >
            <form
                id="space-form"
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
                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Bodega"
                        options={warehouses.map((warehouse) => ({
                            value: warehouse.id,
                            label: `${warehouse.code} - ${warehouse.name}`,
                        }))}
                        error={errors.warehouseId?.message}
                        {...register("warehouseId")}
                    />
                    <Select
                        label="Sector"
                        options={availableSectors.map((sector) => ({
                            value: sector.id,
                            label: `${sector.code} - ${sector.name}`,
                        }))}
                        error={errors.sectorId?.message}
                        {...register("sectorId")}
                    />
                </div>
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
                        options={[...SPACE_STATUS_OPTIONS]}
                        error={errors.status?.message}
                        {...register("status")}
                    />
                </div>
            </form>
        </Modal>
    );
}
