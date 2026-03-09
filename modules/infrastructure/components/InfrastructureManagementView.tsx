"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    Modal,
    Select,
    StatCard,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/modules/auth";
import {
    createSector,
    createSpace,
    createWarehouse,
    deleteSector,
    deleteSpace,
    deleteWarehouse,
    listSectors,
    listSpaces,
    listWarehouses,
    updateSector,
    updateSpace,
    updateWarehouse,
} from "@/modules/infrastructure";
import type {
    CreateSectorInput,
    CreateSpaceInput,
    CreateWarehouseInput,
    InfrastructureStatus,
    ManagedSector,
    ManagedSpace,
    ManagedWarehouse,
    UpdateSectorInput,
    UpdateSpaceInput,
    UpdateWarehouseInput,
} from "@/modules/infrastructure";
import { UserRole } from "@/types";

type CrudMode = "create" | "edit";

type EditorState =
    | { entity: "warehouse"; mode: CrudMode; warehouse?: ManagedWarehouse }
    | { entity: "sector"; mode: CrudMode; sector?: ManagedSector }
    | { entity: "space"; mode: CrudMode; space?: ManagedSpace }
    | null;

const WAREHOUSE_STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activa" },
    { value: "INACTIVE", label: "Inactiva" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
] as const;

const SECTOR_STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
] as const;

const SPACE_STATUS_OPTIONS = [
    { value: "AVAILABLE", label: "Disponible" },
    { value: "OCCUPIED", label: "Ocupado" },
    { value: "RESERVED", label: "Reservado" },
    { value: "MAINTENANCE", label: "Mantenimiento" },
    { value: "INACTIVE", label: "Inactivo" },
] as const;

const STATUS_VARIANTS: Record<
    InfrastructureStatus,
    "success" | "warning" | "danger" | "neutral" | "brand"
> = {
    ACTIVE: "success",
    INACTIVE: "neutral",
    MAINTENANCE: "warning",
    AVAILABLE: "success",
    OCCUPIED: "brand",
    RESERVED: "warning",
};

const STATUS_LABELS: Record<InfrastructureStatus, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    MAINTENANCE: "Mantenimiento",
    AVAILABLE: "Disponible",
    OCCUPIED: "Ocupado",
    RESERVED: "Reservado",
};

const optionalNumberField = z
    .number()
    .min(0, "El valor no puede ser negativo")
    .optional();

const warehouseSchema = z
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
                message:
                    "La capacidad disponible no puede superar la capacidad total.",
                path: ["availableCapacityM2"],
            });
        }
    });

const sectorSchema = z.object({
    warehouseId: z.string().min(1, "Selecciona una bodega"),
    code: z.string().min(2, "El codigo debe tener al menos 2 caracteres"),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    capacityM2: optionalNumberField,
    status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

const spaceSchema = z.object({
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

type WarehouseFormValues = z.infer<typeof warehouseSchema>;
type SectorFormValues = z.infer<typeof sectorSchema>;
type SpaceFormValues = z.infer<typeof spaceSchema>;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible completar la operacion.";
}

function formatCapacity(value: number | null): string {
    if (typeof value !== "number") {
        return "Sin dato";
    }

    return `${value.toLocaleString("es-CO")} m2`;
}

function toOptionalNumber(value: unknown): number | undefined {
    if (value === "" || value === null || value === undefined) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSpaceStatus(
    value: InfrastructureStatus | undefined
): "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" | "INACTIVE" {
    return value === "OCCUPIED" ||
        value === "RESERVED" ||
        value === "MAINTENANCE" ||
        value === "INACTIVE"
        ? value
        : "AVAILABLE";
}

function getStatusLabel(status: InfrastructureStatus): string {
    return STATUS_LABELS[status] ?? status;
}

function TextareaField({
    label,
    error,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
                {label}
            </label>
            <textarea
                className={[
                    "min-h-24 rounded-lg border bg-surface-base px-3 py-2 text-sm text-text-primary transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-brand-default/20",
                    error
                        ? "border-danger-default focus:ring-danger-default/30"
                        : "border-border-default focus:border-border-focus",
                ].join(" ")}
                {...props}
            />
            {error ? <p className="text-xs text-danger-text">{error}</p> : null}
        </div>
    );
}

function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-hover)] px-5 py-8 text-center">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {description}
            </p>
            {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        </div>
    );
}

function WarehouseFormModal({
    isOpen,
    mode,
    warehouse,
    isSubmitting,
    actionError,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    mode: CrudMode;
    warehouse?: ManagedWarehouse;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (
        values: CreateWarehouseInput | UpdateWarehouseInput
    ) => Promise<void>;
}) {
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
                warehouse?.status === "INACTIVE" ||
                warehouse?.status === "MAINTENANCE"
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
                warehouse?.status === "INACTIVE" ||
                warehouse?.status === "MAINTENANCE"
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
                <Input
                    label="Direccion"
                    error={errors.address?.message}
                    {...register("address")}
                />
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
                        {...register("totalCapacityM2", {
                            setValueAs: toOptionalNumber,
                        })}
                    />
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        label="Capacidad disponible (m2)"
                        error={errors.availableCapacityM2?.message}
                        {...register("availableCapacityM2", {
                            setValueAs: toOptionalNumber,
                        })}
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

function SectorFormModal({
    isOpen,
    mode,
    sector,
    warehouses,
    defaultWarehouseId,
    isSubmitting,
    actionError,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    mode: CrudMode;
    sector?: ManagedSector;
    warehouses: ManagedWarehouse[];
    defaultWarehouseId: string | null;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (values: CreateSectorInput | UpdateSectorInput) => Promise<void>;
}) {
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
                        warehouseId: values.warehouseId,
                        code: values.code,
                        name: values.name,
                        description: values.description?.trim() || undefined,
                        capacityM2: values.capacityM2,
                        status: values.status,
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

function SpaceFormModal({
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
}: {
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
}) {
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
                        warehouseId: values.warehouseId,
                        sectorId: values.sectorId,
                        code: values.code,
                        name: values.name,
                        description: values.description?.trim() || undefined,
                        capacityM2: values.capacityM2,
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

export function InfrastructureManagementView() {
    const { user } = useAuth();
    const role = user?.roles?.[0]?.role_name;
    const isSalesViewer = role === UserRole.SALES_AGENT;
    const isClientViewer = role === UserRole.CLIENT;
    const canManageWarehouses = role === UserRole.ADMIN;
    const canManageStructure =
        role === UserRole.ADMIN || role === UserRole.WAREHOUSE_SUPERVISOR;
    const showsSectorPanel = !isClientViewer;

    const [warehouses, setWarehouses] = React.useState<ManagedWarehouse[]>([]);
    const [sectors, setSectors] = React.useState<ManagedSector[]>([]);
    const [spaces, setSpaces] = React.useState<ManagedSpace[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [pageError, setPageError] = React.useState<string | null>(null);
    const [actionError, setActionError] = React.useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(
        null
    );
    const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<
        string | null
    >(null);
    const [selectedSectorId, setSelectedSectorId] = React.useState<string | null>(
        null
    );
    const [editor, setEditor] = React.useState<EditorState>(null);

    const loadInfrastructure = React.useCallback(async () => {
        setIsLoading(true);
        setPageError(null);

        try {
            const [warehouseData, sectorData, spaceData] = await Promise.all([
                listWarehouses(),
                listSectors(),
                listSpaces(),
            ]);

            setWarehouses(warehouseData);
            setSectors(sectorData);
            setSpaces(spaceData);
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadInfrastructure();
    }, [loadInfrastructure]);

    React.useEffect(() => {
        if (warehouses.length === 0) {
            setSelectedWarehouseId(null);
            return;
        }

        setSelectedWarehouseId((current) => {
            if (current && warehouses.some((warehouse) => warehouse.id === current)) {
                return current;
            }

            return warehouses[0]?.id ?? null;
        });
    }, [warehouses]);

    const filteredSectors = React.useMemo(() => {
        if (!selectedWarehouseId) {
            return sectors;
        }

        return sectors.filter((sector) => sector.warehouseId === selectedWarehouseId);
    }, [sectors, selectedWarehouseId]);

    React.useEffect(() => {
        if (!showsSectorPanel) {
            setSelectedSectorId(null);
            return;
        }

        if (filteredSectors.length === 0) {
            setSelectedSectorId(null);
            return;
        }

        setSelectedSectorId((current) => {
            if (current && filteredSectors.some((sector) => sector.id === current)) {
                return current;
            }

            return filteredSectors[0]?.id ?? null;
        });
    }, [filteredSectors, showsSectorPanel]);

    const filteredSpaces = React.useMemo(() => {
        return spaces.filter((space) => {
            if (selectedWarehouseId && space.warehouseId !== selectedWarehouseId) {
                return false;
            }

            if (showsSectorPanel && selectedSectorId) {
                return space.sectorId === selectedSectorId;
            }

            return true;
        });
    }, [selectedSectorId, selectedWarehouseId, showsSectorPanel, spaces]);

    const selectedWarehouse = React.useMemo(
        () =>
            warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
            null,
        [selectedWarehouseId, warehouses]
    );

    const selectedSector = React.useMemo(
        () => filteredSectors.find((sector) => sector.id === selectedSectorId) ?? null,
        [filteredSectors, selectedSectorId]
    );

    const totals = React.useMemo(() => {
        const occupiedSpaces = spaces.filter(
            (space) => space.status === "OCCUPIED" || space.status === "RESERVED"
        ).length;

        return {
            warehouses: warehouses.length,
            sectors: sectors.length,
            spaces: spaces.length,
            occupiedSpaces,
        };
    }, [sectors.length, spaces, warehouses.length]);

    function closeEditor() {
        setEditor(null);
        setActionError(null);
    }

    async function runMutation(task: () => Promise<void>, successMessage: string) {
        setIsSubmitting(true);
        setActionError(null);

        try {
            await task();
            closeEditor();
            await loadInfrastructure();
            setFeedbackMessage(successMessage);
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteWarehouseAction(warehouse: ManagedWarehouse) {
        if (
            !window.confirm(
                `Se eliminara la bodega ${warehouse.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        await runMutation(
            async () => {
                await deleteWarehouse(warehouse.id);
            },
            "Bodega eliminada correctamente."
        );
    }

    async function handleDeleteSectorAction(sector: ManagedSector) {
        if (
            !window.confirm(
                `Se eliminara el sector ${sector.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        await runMutation(
            async () => {
                await deleteSector(sector.id);
            },
            "Sector eliminado correctamente."
        );
    }

    async function handleDeleteSpaceAction(space: ManagedSpace) {
        if (
            !window.confirm(
                `Se eliminara el espacio ${space.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        await runMutation(
            async () => {
                await deleteSpace(space.id);
            },
            "Espacio eliminado correctamente."
        );
    }

    return (
        <RoleGuard
            allowedRoles={[
                UserRole.ADMIN,
                UserRole.WAREHOUSE_SUPERVISOR,
                UserRole.WAREHOUSE_OPERATOR,
                UserRole.SALES_AGENT,
                UserRole.CLIENT,
            ]}
        >
            <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1
                            className="text-3xl font-extrabold tracking-tight"
                            style={{ color: "var(--color-text-primary)" }}
                        >
                            {isClientViewer
                                ? "Disponibilidad de bodegas"
                                : isSalesViewer
                                    ? "Disponibilidad operativa"
                                    : "Infraestructura de bodegas"}
                        </h1>
                        <p
                            className="mt-2 max-w-3xl text-base"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            {isClientViewer
                                ? "Consulta bodegas y espacios disponibles para tu operacion. "
                                : isSalesViewer
                                    ? "Consulta la disponibilidad real de bodegas, sectores y espacios antes de ofertar. "
                                    : "Gestiona la estructura fisica de la operacion. "}
                            {canManageWarehouses
                                ? "Administracion puede modificar bodegas, sectores y espacios."
                                : canManageStructure
                                    ? "Supervision puede operar sectores y espacios, pero no modificar bodegas."
                                    : isSalesViewer
                                        ? "Ventas puede consultar bodegas, sectores y espacios sin capacidad de edicion."
                                        : isClientViewer
                                            ? "Cliente puede consultar bodegas y espacios sin capacidad de edicion."
                                            : "Operacion puede consultar bodegas, sectores y espacios sin capacidad de edicion."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            label={
                                canManageWarehouses
                                    ? "Control total"
                                    : canManageStructure
                                        ? "Bodegas en solo lectura"
                                        : isSalesViewer
                                            ? "Consulta comercial"
                                            : isClientViewer
                                                ? "Disponibilidad cliente"
                                                : "Consulta operativa"
                            }
                            variant={
                                canManageWarehouses
                                    ? "danger"
                                    : canManageStructure
                                        ? "info"
                                        : isSalesViewer
                                            ? "brand"
                                            : "neutral"
                            }
                        />
                        {canManageWarehouses ? (
                            <Button
                                onClick={() => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "warehouse",
                                        mode: "create",
                                    });
                                }}
                            >
                                Nueva bodega
                            </Button>
                        ) : null}
                        <Button variant="outline" onClick={() => loadInfrastructure()}>
                            Recargar
                        </Button>
                    </div>
                </div>

                {feedbackMessage ? (
                    <div className="rounded-xl border border-[var(--color-success-strong)] bg-[var(--color-success-subtle)] px-4 py-3 text-sm text-[var(--color-success-strong)]">
                        {feedbackMessage}
                    </div>
                ) : null}

                {pageError ? (
                    <Card>
                        <CardBody className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-danger-strong)]">
                                    No fue posible cargar la infraestructura
                                </h2>
                                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                                    {pageError}
                                </p>
                            </div>
                            <Button onClick={() => loadInfrastructure()}>
                                Intentar nuevamente
                            </Button>
                        </CardBody>
                    </Card>
                ) : null}

                {!pageError ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                title="Bodegas"
                                value={totals.warehouses}
                                description="Instalaciones registradas"
                            />
                            <StatCard
                                title="Sectores"
                                value={totals.sectors}
                                description="Divisiones internas activas"
                            />
                            <StatCard
                                title="Espacios"
                                value={totals.spaces}
                                description="Ubicaciones administradas"
                            />
                            <StatCard
                                title="Espacios ocupados"
                                value={totals.occupiedSpaces}
                                description="Ocupados o reservados"
                            />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                            <Card>
                                <CardHeader
                                    title={
                                        isClientViewer
                                            ? "Bodegas disponibles"
                                            : "Bodegas registradas"
                                    }
                                    description={
                                        isClientViewer
                                            ? "Selecciona una bodega para revisar sus espacios disponibles."
                                            : "Selecciona una bodega para trabajar su estructura interna."
                                    }
                                />
                                <CardBody padding="none" className="space-y-4">
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface-hover)]"
                                            />
                                        ))
                                    ) : warehouses.length > 0 ? (
                                        warehouses.map((warehouse) => {
                                            const isSelected =
                                                warehouse.id === selectedWarehouseId;

                                            return (
                                                <Card
                                                    key={warehouse.id}
                                                    clickable
                                                    variant={isSelected ? "outlined" : "default"}
                                                    className={[
                                                        "border",
                                                        isSelected
                                                            ? "border-[var(--color-brand-strong)] bg-[var(--color-brand-subtle)]"
                                                            : "border-[var(--color-border-subtle)]",
                                                    ].join(" ")}
                                                    onClick={() => {
                                                        setSelectedWarehouseId(warehouse.id);
                                                        setFeedbackMessage(null);
                                                    }}
                                                >
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                                                                    {warehouse.name}
                                                                </h3>
                                                                <Badge
                                                                    label={warehouse.code}
                                                                    variant="brand"
                                                                />
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
                                                                    Total:{" "}
                                                                    {formatCapacity(
                                                                        warehouse.totalCapacityM2
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    Disponible:{" "}
                                                                    {formatCapacity(
                                                                        warehouse.availableCapacityM2
                                                                    )}
                                                                </span>
                                                                {warehouse.cityName ? (
                                                                    <span>
                                                                        Ciudad: {warehouse.cityName}
                                                                    </span>
                                                                ) : null}
                                                                {warehouse.typeName ? (
                                                                    <span>
                                                                        Tipo: {warehouse.typeName}
                                                                    </span>
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
                                                                            setFeedbackMessage(null);
                                                                            setEditor({
                                                                                entity: "warehouse",
                                                                                mode: "edit",
                                                                                warehouse,
                                                                            });
                                                                        }}
                                                                    >
                                                                        Editar
                                                                    </Button>
                                                                    <Button
                                                                        variant="danger"
                                                                        size="sm"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            void handleDeleteWarehouseAction(
                                                                                warehouse
                                                                            );
                                                                        }}
                                                                    >
                                                                        Eliminar
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Badge
                                                                    label="Solo lectura"
                                                                    variant="neutral"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })
                                    ) : (
                                        <EmptyState
                                            title="No hay bodegas registradas"
                                            description="Crea la primera bodega para empezar a modelar sectores y espacios."
                                            action={
                                                canManageWarehouses ? (
                                                    <Button
                                                        onClick={() =>
                                                            setEditor({
                                                                entity: "warehouse",
                                                                mode: "create",
                                                            })
                                                        }
                                                    >
                                                        Crear bodega
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    )}
                                </CardBody>
                            </Card>

                            <Card>
                                <CardHeader
                                    title="Detalle operativo"
                                    description={
                                        isClientViewer
                                            ? "Resumen de disponibilidad para la bodega seleccionada."
                                            : "Resumen del contexto sobre el que se esta trabajando."
                                    }
                                />
                                <CardBody className="space-y-4">
                                    {selectedWarehouse ? (
                                        <>
                                            <div className="rounded-2xl bg-[var(--color-surface-hover)] p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                                    Bodega activa
                                                </p>
                                                <h3 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                                                    {selectedWarehouse.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                                    {selectedWarehouse.address}
                                                </p>
                                                <div className="mt-4 grid gap-3 text-sm text-[var(--color-text-secondary)]">
                                                    <div className="flex items-center justify-between">
                                                        <span>Sectores visibles</span>
                                                        <strong className="text-[var(--color-text-primary)]">
                                                            {filteredSectors.length}
                                                        </strong>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Espacios visibles</span>
                                                        <strong className="text-[var(--color-text-primary)]">
                                                            {filteredSpaces.length}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-[var(--color-border-subtle)] p-4">
                                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                    Permisos activos para este rol
                                                </p>
                                                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                                                    <li>
                                                        {canManageWarehouses
                                                            ? "Puede crear, editar y eliminar bodegas."
                                                            : "Puede consultar bodegas, pero no modificar sus datos base."}
                                                    </li>
                                                    <li>
                                                        {canManageStructure
                                                            ? "Puede crear, editar y eliminar sectores."
                                                            : isClientViewer
                                                                ? "La consulta se concentra en la disponibilidad de espacios por bodega."
                                                                : "Puede consultar sectores, pero no modificarlos."}
                                                    </li>
                                                    <li>
                                                        {canManageStructure
                                                            ? "Puede crear, editar y eliminar espacios."
                                                            : "Puede consultar espacios, pero no modificarlos."}
                                                    </li>
                                                </ul>
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState
                                            title="Selecciona una bodega"
                                            description="El detalle operativo aparece cuando eliges una bodega de trabajo."
                                        />
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">
                            {showsSectorPanel ? (
                                <Card>
                                <CardHeader
                                    title="Sectores"
                                    description="Gestiona la segmentacion interna por bodega."
                                    action={
                                        canManageStructure ? (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setFeedbackMessage(null);
                                                    setEditor({
                                                        entity: "sector",
                                                        mode: "create",
                                                    });
                                                }}
                                                disabled={!selectedWarehouse}
                                            >
                                                Nuevo sector
                                            </Button>
                                        ) : undefined
                                    }
                                />
                                <CardBody padding="none" className="space-y-4">
                                    {filteredSectors.length > 0 ? (
                                        filteredSectors.map((sector) => {
                                            const isSelected =
                                                sector.id === selectedSectorId;

                                            return (
                                                <Card
                                                    key={sector.id}
                                                    clickable
                                                    variant={isSelected ? "outlined" : "default"}
                                                    className={[
                                                        "border",
                                                        isSelected
                                                            ? "border-[var(--color-brand-strong)] bg-[var(--color-brand-subtle)]"
                                                            : "border-[var(--color-border-subtle)]",
                                                    ].join(" ")}
                                                    onClick={() => {
                                                        setSelectedSectorId(sector.id);
                                                        setFeedbackMessage(null);
                                                    }}
                                                >
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                                                                    {sector.name}
                                                                </h3>
                                                                <Badge
                                                                    label={sector.code}
                                                                    variant="brand"
                                                                />
                                                                <Badge
                                                                    label={getStatusLabel(sector.status)}
                                                                    variant={STATUS_VARIANTS[sector.status]}
                                                                />
                                                            </div>
                                                            <p className="text-sm text-[var(--color-text-secondary)]">
                                                                {sector.description ||
                                                                    "Sin descripcion operativa"}
                                                            </p>
                                                            <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
                                                                <span>
                                                                    Bodega:{" "}
                                                                    {sector.warehouseName ||
                                                                        "Sin referencia"}
                                                                </span>
                                                                <span>
                                                                    Capacidad:{" "}
                                                                    {formatCapacity(
                                                                        sector.capacityM2
                                                                    )}
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
                                                                            setFeedbackMessage(null);
                                                                            setEditor({
                                                                                entity: "sector",
                                                                                mode: "edit",
                                                                                sector,
                                                                            });
                                                                        }}
                                                                    >
                                                                        Editar
                                                                    </Button>
                                                                    <Button
                                                                        variant="danger"
                                                                        size="sm"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            void handleDeleteSectorAction(
                                                                                sector
                                                                            );
                                                                        }}
                                                                    >
                                                                        Eliminar
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Badge
                                                                    label="Solo lectura"
                                                                    variant="neutral"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })
                                    ) : (
                                        <EmptyState
                                            title="No hay sectores para esta bodega"
                                            description={
                                                selectedWarehouse
                                                    ? "Crea el primer sector para estructurar esta instalacion."
                                                    : "Primero selecciona una bodega para gestionar sectores."
                                            }
                                            action={
                                                selectedWarehouse &&
                                                canManageStructure ? (
                                                    <Button
                                                        onClick={() =>
                                                            setEditor({
                                                                entity: "sector",
                                                                mode: "create",
                                                            })
                                                        }
                                                    >
                                                        Crear sector
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    )}
                                </CardBody>
                                </Card>
                            ) : null}

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
                                                onClick={() => {
                                                    setFeedbackMessage(null);
                                                    setEditor({
                                                        entity: "space",
                                                        mode: "create",
                                                    });
                                                }}
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
                                            {selectedWarehouse
                                                ? ` de ${selectedWarehouse.name}`
                                                : ""}
                                            .
                                        </div>
                                    ) : null}

                                    {filteredSpaces.length > 0 ? (
                                        filteredSpaces.map((space) => (
                                            <Card
                                                key={space.id}
                                                variant="default"
                                                className="border border-[var(--color-border-subtle)]"
                                            >
                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                                                                {space.name}
                                                            </h3>
                                                            <Badge
                                                                label={space.code}
                                                                variant="brand"
                                                            />
                                                            <Badge
                                                                label={getStatusLabel(space.status)}
                                                                variant={STATUS_VARIANTS[space.status]}
                                                            />
                                                        </div>
                                                        <p className="text-sm text-[var(--color-text-secondary)]">
                                                            {space.description ||
                                                                "Sin descripcion operativa"}
                                                        </p>
                                                        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
                                                            <span>
                                                                Sector:{" "}
                                                                {space.sectorName ||
                                                                    "Sin referencia"}
                                                            </span>
                                                            <span>
                                                                Bodega:{" "}
                                                                {space.warehouseName ||
                                                                    "Sin referencia"}
                                                            </span>
                                                            <span>
                                                                Capacidad:{" "}
                                                                {formatCapacity(
                                                                    space.capacityM2
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {canManageStructure ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setFeedbackMessage(null);
                                                                        setEditor({
                                                                            entity: "space",
                                                                            mode: "edit",
                                                                            space,
                                                                        });
                                                                    }}
                                                                >
                                                                    Editar
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        void handleDeleteSpaceAction(
                                                                            space
                                                                        );
                                                                    }}
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Badge
                                                                label="Solo lectura"
                                                                variant="neutral"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <EmptyState
                                            title="No hay espacios disponibles"
                                            description={
                                                showsSectorPanel
                                                    ? selectedSector
                                                        ? "Crea el primer espacio operativo dentro del sector seleccionado."
                                                        : "Selecciona un sector para visualizar y administrar espacios."
                                                    : selectedWarehouse
                                                        ? "No hay espacios visibles para la bodega seleccionada."
                                                        : "Selecciona una bodega para visualizar espacios disponibles."
                                            }
                                            action={
                                                selectedWarehouse &&
                                                selectedSector &&
                                                canManageStructure ? (
                                                    <Button
                                                        onClick={() =>
                                                            setEditor({
                                                                entity: "space",
                                                                mode: "create",
                                                            })
                                                        }
                                                    >
                                                        Crear espacio
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </>
                ) : null}

                <WarehouseFormModal
                    isOpen={editor?.entity === "warehouse"}
                    mode={editor?.entity === "warehouse" ? editor.mode : "create"}
                    warehouse={
                        editor?.entity === "warehouse" ? editor.warehouse : undefined
                    }
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        await runMutation(
                            async () => {
                                if (
                                    editor?.entity === "warehouse" &&
                                    editor.mode === "edit" &&
                                    editor.warehouse
                                ) {
                                    await updateWarehouse(
                                        editor.warehouse.id,
                                        values as UpdateWarehouseInput
                                    );
                                    return;
                                }

                                await createWarehouse(values as CreateWarehouseInput);
                            },
                            editor?.entity === "warehouse" &&
                                editor.mode === "edit"
                                ? "Bodega actualizada correctamente."
                                : "Bodega creada correctamente."
                        );
                    }}
                />

                <SectorFormModal
                    isOpen={editor?.entity === "sector"}
                    mode={editor?.entity === "sector" ? editor.mode : "create"}
                    sector={editor?.entity === "sector" ? editor.sector : undefined}
                    warehouses={warehouses}
                    defaultWarehouseId={selectedWarehouseId}
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        await runMutation(
                            async () => {
                                if (
                                    editor?.entity === "sector" &&
                                    editor.mode === "edit" &&
                                    editor.sector
                                ) {
                                    await updateSector(
                                        editor.sector.id,
                                        values as UpdateSectorInput
                                    );
                                    return;
                                }

                                await createSector(values as CreateSectorInput);
                            },
                            editor?.entity === "sector" && editor.mode === "edit"
                                ? "Sector actualizado correctamente."
                                : "Sector creado correctamente."
                        );
                    }}
                />

                <SpaceFormModal
                    isOpen={editor?.entity === "space"}
                    mode={editor?.entity === "space" ? editor.mode : "create"}
                    space={editor?.entity === "space" ? editor.space : undefined}
                    warehouses={warehouses}
                    sectors={filteredSectors}
                    defaultWarehouseId={selectedWarehouseId}
                    defaultSectorId={selectedSectorId}
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        await runMutation(
                            async () => {
                                if (
                                    editor?.entity === "space" &&
                                    editor.mode === "edit" &&
                                    editor.space
                                ) {
                                    await updateSpace(
                                        editor.space.id,
                                        values as UpdateSpaceInput
                                    );
                                    return;
                                }

                                await createSpace(values as CreateSpaceInput);
                            },
                            editor?.entity === "space" && editor.mode === "edit"
                                ? "Espacio actualizado correctamente."
                                : "Espacio creado correctamente."
                        );
                    }}
                />
            </div>
        </RoleGuard>
    );
}
