import * as React from "react";
import { ProductStatus, MovementType, UserRole } from "@/types";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand";
type BadgeSize = "sm" | "md";

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    className?: string;
}

// Tokens semánticos mapeados directamente
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
    success: "bg-success-subtle text-success-text ring-success-default/20",
    warning: "bg-warning-subtle text-warning-text ring-warning-default/20",
    danger: "bg-danger-subtle  text-danger-text  ring-danger-default/20",
    info: "bg-info-subtle    text-info-text     ring-info-default/20",
    neutral: "bg-surface-sunken text-text-secondary ring-border-default/40",
    brand: "bg-brand-subtle   text-brand-stronger ring-brand-default/20",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
    success: "fill-success-default",
    warning: "fill-warning-default",
    danger: "fill-danger-default",
    info: "fill-info-default",
    neutral: "fill-text-tertiary",
    brand: "fill-brand-default",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2.5 py-1   text-xs",
};

// ---------------------------------------------------------------------------
// Mapeos de dominio
// ---------------------------------------------------------------------------

const PRODUCT_STATUS_VARIANT: Record<ProductStatus, BadgeVariant> = {
    [ProductStatus.ACTIVE]: "success",
    [ProductStatus.INACTIVE]: "neutral",
    [ProductStatus.DISCONTINUED]: "danger",
};

const MOVEMENT_TYPE_VARIANT: Record<MovementType, BadgeVariant> = {
    [MovementType.ENTRY]: "success",
    [MovementType.EXIT]: "warning",
    [MovementType.TRANSFER]: "info",
    [MovementType.ADJUSTMENT]: "brand",
    [MovementType.RETURN]: "neutral",
};

const USER_ROLE_VARIANT: Record<UserRole, BadgeVariant> = {
    [UserRole.ADMIN]: "danger",
    [UserRole.WAREHOUSE_SUPERVISOR]: "brand",
    [UserRole.WAREHOUSE_OPERATOR]: "info",
    [UserRole.SALES_AGENT]: "success",
    [UserRole.CLIENT]: "neutral",
};

function Badge({ label, variant = "neutral", size = "md", dot = false, className = "" }: BadgeProps) {
    return (
        <span className={[
            "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset",
            VARIANT_CLASSES[variant], SIZE_CLASSES[size], className,
        ].join(" ")}>
            {dot && (
                <svg viewBox="0 0 6 6" aria-hidden="true"
                    className={`h-1.5 w-1.5 ${DOT_CLASSES[variant]}`}>
                    <circle cx="3" cy="3" r="3" />
                </svg>
            )}
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Componentes de dominio
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ProductStatus, string> = {
    [ProductStatus.ACTIVE]: "Activo",
    [ProductStatus.INACTIVE]: "Inactivo",
    [ProductStatus.DISCONTINUED]: "Descontinuado",
};

function ProductStatusBadge({ status, size }: { status: ProductStatus; size?: BadgeSize }) {
    return <Badge label={STATUS_LABEL[status]} variant={PRODUCT_STATUS_VARIANT[status]} size={size} dot />;
}

const MOVE_LABEL: Record<MovementType, string> = {
    [MovementType.ENTRY]: "Entrada",
    [MovementType.EXIT]: "Salida",
    [MovementType.TRANSFER]: "Traslado",
    [MovementType.ADJUSTMENT]: "Ajuste",
    [MovementType.RETURN]: "Devolución",
};

function MovementTypeBadge({ type, size }: { type: MovementType; size?: BadgeSize }) {
    return <Badge label={MOVE_LABEL[type]} variant={MOVEMENT_TYPE_VARIANT[type]} size={size} />;
}

const ROLE_LABEL: Record<UserRole, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.WAREHOUSE_SUPERVISOR]: "Supervisor de Bodega",
    [UserRole.WAREHOUSE_OPERATOR]: "Operador de Bodega",
    [UserRole.SALES_AGENT]: "Agente de Ventas",
    [UserRole.CLIENT]: "Cliente",
};

function RoleBadge({ role, size }: { role: UserRole; size?: BadgeSize }) {
    return <Badge label={ROLE_LABEL[role]} variant={USER_ROLE_VARIANT[role]} size={size} />;
}

export {
    Badge, ProductStatusBadge, MovementTypeBadge, RoleBadge,
    PRODUCT_STATUS_VARIANT, MOVEMENT_TYPE_VARIANT, USER_ROLE_VARIANT
};
export type { BadgeVariant, BadgeSize, BadgeProps };
