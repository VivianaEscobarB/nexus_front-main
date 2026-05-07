"use client";

import type { Role } from "@/types";
import { UserRole } from "@/types";
import {
    getNormalizedUserRoleNames,
    getPrimaryRoleName,
} from "@/shared/auth/primaryRole";

const ROLE_LABELS: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.WAREHOUSE_SUPERVISOR]: "Supervisor de bodega",
    [UserRole.WAREHOUSE_OPERATOR]: "Operador de bodega",
    [UserRole.SALES_AGENT]: "Agente comercial",
    [UserRole.CLIENT]: "Cliente",
};

function labelForRole(canonical: string): string {
    return (
        ROLE_LABELS[canonical] ??
        canonical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

type UserProfileRoleIndicatorProps = {
    roles: Role[] | null | undefined;
    className?: string;
};

/**
 * Muestra el rol principal de sesión y, si hay más de uno, el resto como texto secundario.
 */
export function UserProfileRoleIndicator({
    roles,
    className = "",
}: UserProfileRoleIndicatorProps) {
    const all = getNormalizedUserRoleNames(roles);
    const hasRoles = all.length > 0;
    const primary = hasRoles
        ? getPrimaryRoleName(roles, UserRole.WAREHOUSE_OPERATOR)
        : null;
    const secondary =
        hasRoles && primary ? all.filter((r) => r !== primary) : [];

    return (
        <div
            className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] px-4 py-3 ${className}`}
        >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Rol en el sistema
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                {hasRoles && primary ? (
                    <>
                        <span
                            className="inline-flex items-center rounded-full border border-[var(--color-brand-default)]/35 bg-[var(--color-brand-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-strong)]"
                            title="Rol principal usado para el menú y permisos"
                        >
                            {labelForRole(primary)}
                        </span>
                        {secondary.length > 0 ? (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                                También:{" "}
                                {secondary.map(labelForRole).join(", ")}
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                        Sin rol asignado en esta sesión.
                    </span>
                )}
            </div>
        </div>
    );
}
