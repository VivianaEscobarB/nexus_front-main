import type { InfrastructureStatus } from "@/modules/infrastructure/api/infrastructureTypes";

export const STATUS_VARIANTS: Record<
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

export const STATUS_LABELS: Record<InfrastructureStatus, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    MAINTENANCE: "Mantenimiento",
    AVAILABLE: "Disponible",
    OCCUPIED: "Ocupado",
    RESERVED: "Reservado",
};

export function getStatusLabel(status: InfrastructureStatus): string {
    return STATUS_LABELS[status] ?? status;
}

export function formatCapacity(value: number | null | undefined): string {
    if (typeof value !== "number") {
        return "Sin dato";
    }

    return `${value.toLocaleString("es-CO")} m2`;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible completar la operacion.";
}

export function toOptionalNumber(value: unknown): number | undefined {
    if (value === "" || value === null || value === undefined) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
