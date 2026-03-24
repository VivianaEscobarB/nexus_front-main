import { httpClient } from "@/shared/api/httpClient";

export interface ApiRole {
    id: number;
    name: string;
    description?: string | null;
    createdAt?: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function extractCollection(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!isObject(payload)) {
        return [];
    }

    const candidates = [
        payload.data,
        payload.items,
        payload.content,
        payload.results,
        payload.roles,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

function normalizeRoleName(raw: unknown): string {
    if (typeof raw !== "string" || raw.trim().length === 0) {
        return "";
    }
    const trimmed = raw.trim();
    return trimmed.startsWith("ROLE_") ? trimmed.slice(5) : trimmed;
}

/**
 * Lista roles disponibles para asignación de usuarios.
 * GET /api/roles
 */
export async function listRoles(): Promise<ApiRole[]> {
    const payload = await httpClient.get<unknown>("/api/roles");

    return extractCollection(payload)
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id),
            name: normalizeRoleName(item.name ?? item.role_name ?? item.roleName),
            description:
                typeof item.description === "string" ? item.description : null,
            createdAt:
                typeof item.createdAt === "string"
                    ? item.createdAt
                    : typeof item.created_at === "string"
                      ? item.created_at
                      : null,
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
}
