import type { Role } from "@/types";
import { UserRole } from "@/types";

/** De mayor a menor privilegio para decidir qué shell de dashboard mostrar con varios roles. */
const SESSION_ROLE_PRIORITY: readonly string[] = [
    UserRole.ADMIN,
    UserRole.WAREHOUSE_SUPERVISOR,
    UserRole.WAREHOUSE_OPERATOR,
    UserRole.SALES_AGENT,
    UserRole.CLIENT,
];

const KNOWN_USER_ROLES = new Set<string>(Object.values(UserRole));

export function normalizeSessionRoleName(
    raw: string | undefined | null
): string | null {
    if (typeof raw !== "string") {
        return null;
    }
    let role = raw.trim();
    if (!role) {
        return null;
    }
    if (role.startsWith("ROLE_")) {
        role = role.slice(5);
    }
    if (role === "MANAGER") {
        role = UserRole.ADMIN;
    }
    const upper = role.toUpperCase();
    if (KNOWN_USER_ROLES.has(upper)) {
        return upper;
    }
    return role;
}

/**
 * Elige un único rol de sesión cuando el usuario tiene varios (misma prioridad que el menú y el dashboard).
 */
export function getPrimaryRoleName(
    roles: Pick<Role, "role_name">[] | undefined | null,
    fallback: string = UserRole.WAREHOUSE_OPERATOR
): string {
    if (!roles?.length) {
        return fallback;
    }

    const normalizedUnique = new Set<string>();
    for (const entry of roles) {
        const n = normalizeSessionRoleName(entry.role_name);
        if (n) {
            normalizedUnique.add(n);
        }
    }

    if (normalizedUnique.size === 0) {
        return fallback;
    }

    for (const candidate of SESSION_ROLE_PRIORITY) {
        if (normalizedUnique.has(candidate)) {
            return candidate;
        }
    }

    return normalizeSessionRoleName(roles[0].role_name) ?? fallback;
}

export function getNormalizedUserRoleNames(
    roles: Pick<Role, "role_name">[] | undefined | null
): string[] {
    if (!roles?.length) {
        return [];
    }
    const unique = new Set<string>();
    for (const entry of roles) {
        const n = normalizeSessionRoleName(entry.role_name);
        if (n) {
            unique.add(n);
        }
    }
    return [...unique];
}

/** Comprueba si el usuario tiene al menos uno de los roles canónicos (tras normalizar prefijos y mayúsculas). */
export function userHasRole(
    roles: Pick<Role, "role_name">[] | undefined | null,
    ...allowedCanonical: string[]
): boolean {
    if (!allowedCanonical.length) {
        return false;
    }
    const current = new Set(getNormalizedUserRoleNames(roles));
    return allowedCanonical.some((role) => {
        const key = normalizeSessionRoleName(role) ?? role;
        return current.has(key);
    });
}
