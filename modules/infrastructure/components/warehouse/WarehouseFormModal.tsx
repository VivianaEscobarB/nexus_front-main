import { Input, Modal, Select, Button } from "@/components/ui";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { CreateWarehouseInput, UpdateWarehouseInput, ManagedWarehouse } from "@/modules/infrastructure";
import { toOptionalNumber } from "../utils";
import type { CrudMode } from "../types";

export const WAREHOUSE_STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activa" },
    { value: "INACTIVE", label: "Inactiva" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
] as const;

const optionalNumberField = z
    .number()
    .min(0, "El valor no puede ser negativo")
    .optional();

export const warehouseSchema = z
    .object({
        code: z.string().min(2, "El codigo debe tener al menos 2 caracteres"),
        name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
        address: z.string().min(5, "La direccion debe tener al menos 5 caracteres"),
        cityId: z.string().optional(),
        warehouseTypeId: z.string().optional(),
        totalCapacityM2: optionalNumberField,
        availableCapacityM2: optionalNumberField,
        status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
    })
    .superRefine((value, context) => {
        if (
            typeof value.totalCapacityM2 === "number" &&
            typeof value.availableCapacityM2 === "number" &&
            value.availableCapacityM2 > value.totalCapacityM2
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La capacidad disponible no puede superar la capacidad total.",
                path: ["availableCapacityM2"],
            });
        }
    });

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface WarehouseFormModalProps {
    isOpen: boolean;
    mode: CrudMode;
    warehouse?: ManagedWarehouse;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (values: CreateWarehouseInput | UpdateWarehouseInput) => Promise<void>;
}

export function WarehouseFormModal({
    isOpen,
    mode,
    warehouse,
    isSubmitting,
    actionError,
    onClose,
    onSubmit,
}: WarehouseFormModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<WarehouseFormValues>({
        resolver: zodResolver(warehouseSchema),
        mode: "onChange",
        defaultValues: {
            code: warehouse?.code ?? "",
            name: warehouse?.name ?? "",
            address: warehouse?.address ?? "",
            cityId: "",
            warehouseTypeId: "",
            totalCapacityM2: warehouse?.totalCapacityM2 ?? undefined,
            availableCapacityM2: warehouse?.availableCapacityM2 ?? undefined,
            status:
                warehouse?.status === "INACTIVE" || warehouse?.status === "MAINTENANCE"
                    ? warehouse.status
                    : "ACTIVE",
        },
    });

    React.useEffect(() => {
        reset({
            code: warehouse?.code ?? "",
            name: warehouse?.name ?? "",
            address: warehouse?.address ?? "",
            cityId: "",
            warehouseTypeId: "",
            totalCapacityM2: warehouse?.totalCapacityM2 ?? undefined,
            availableCapacityM2: warehouse?.availableCapacityM2 ?? undefined,
            status:
                warehouse?.status === "INACTIVE" || warehouse?.status === "MAINTENANCE"
                    ? warehouse.status
                    : "ACTIVE",
        });
    }, [warehouse, reset]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === "create" ? "Nueva bodega" : "Editar bodega"}
            description="Define la informacion principal de la bodega."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="warehouse-form"
                        isLoading={isSubmitting}
                        disabled={!isValid}
                    >
                        {mode === "create" ? "Crear bodega" : "Guardar cambios"}
                    </Button>
                </>
            }
        >
            <form
                id="warehouse-form"
                className="space-y-5"
                onSubmit={handleSubmit(async (values) => {
                    await onSubmit({
                        code: values.code,
                        name: values.name,
                        address: values.address,
                        cityId: values.cityId?.trim() || undefined,
                        warehouseTypeId: values.warehouseTypeId?.trim() || undefined,
                        totalCapacityM2: values.totalCapacityM2,
                        availableCapacityM2: values.availableCapacityM2,
                        status: values.status,
                    });
                })}
            >
                {actionError ? (
                    <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]">
                        {actionError}
                    </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Codigo" error={errors.code?.message} {...register("code")} />
                    <Input label="Nombre" error={errors.name?.message} {...register("name")} />
                </div>
                <Input label="Direccion" error={errors.address?.message} {...register("address")} />
                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Ciudad ID"
                        hint="Opcional. Util si la API solicita una ciudad existente."
                        error={errors.cityId?.message}
                        {...register("cityId")}
                    />
                    <Input
                        label="Tipo de bodega ID"
                        hint="Opcional. Usa el identificador real del backend si aplica."
                        error={errors.warehouseTypeId?.message}
                        {...register("warehouseTypeId")}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        label="Capacidad total (m2)"
                        error={errors.totalCapacityM2?.message}
                        {...register("totalCapacityM2", { setValueAs: toOptionalNumber })}
                    />
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        label="Capacidad disponible (m2)"
                        error={errors.availableCapacityM2?.message}
                        {...register("availableCapacityM2", { setValueAs: toOptionalNumber })}
                    />
                    <Select
                        label="Estado"
                        options={[...WAREHOUSE_STATUS_OPTIONS]}
                        error={errors.status?.message}
                        {...register("status")}
                    />
                </div>
            </form>
        </Modal>
    );
}
