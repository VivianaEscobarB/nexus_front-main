import { httpClient } from "@/shared/api/httpClient";
import type {
    CreateUserInput,
    ListUsersParams,
    ManagedUser,
    ManagedUserStatus,
    UpdateUserInput,
} from "@/modules/users/api/userTypes";

const USERS_BASE_PATH = "/api/users";
const VALID_STATUSES = new Set<ManagedUserStatus>([
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeStatus(value: unknown): ManagedUserStatus {
    if (typeof value === "string" && VALID_STATUSES.has(value as ManagedUserStatus)) {
        return value as ManagedUserStatus;
    }

    return "ACTIVE";
}

function normalizeRole(role: unknown): string | null {
    if (typeof role === "string") {
        const normalizedRole = role.startsWith("ROLE_") ? role.slice(5) : role;
        return normalizedRole === "MANAGER" ? "ADMIN" : normalizedRole;
    }

    if (isObject(role) && typeof role.role_name === "string") {
        const normalizedRole = role.role_name.startsWith("ROLE_")
            ? role.role_name.slice(5)
            : role.role_name;
        return normalizedRole === "MANAGER" ? "ADMIN" : normalizedRole;
    }

    return null;
}

function extractRoles(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(normalizeRole)
        .filter((role): role is string => Boolean(role));
}

function mapApiUser(payload: unknown): ManagedUser {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un usuario invalido.");
    }

    const id = payload.id ?? payload.user_id ?? payload.userId;
    const username =
        payload.username ??
        payload.name ??
        [payload.first_name, payload.last_name]
            .filter((part) => typeof part === "string" && part.trim().length > 0)
            .join(" ");
    const email = getString(payload.email);
    const normalizedUsername = getString(username);

    if (!id || !email || !normalizedUsername) {
        throw new Error("La API devolvio un usuario incompleto.");
    }

    return {
        id: String(id),
        username: normalizedUsername,
        email,
        status: normalizeStatus(payload.status),
        roles: extractRoles(payload.roles),
        clientId:
            getString(payload.clientId) ??
            getString(payload.client_id) ??
            (isObject(payload.client)
                ? getString(payload.client.id) ??
                getString(payload.client.client_id)
                : null),
        cityId:
            getNumber(payload.cityId) ??
            getNumber(payload.city_id) ??
            (isObject(payload.city) ? getNumber(payload.city.id) : null) ??
            null,
        clientName:
            getString(payload.clientName) ??
            getString(payload.client_name) ??
            (isObject(payload.client)
                ? getString(payload.client.business_name) ??
                getString(payload.client.businessName) ??
                getString(payload.client.name)
                : null),
        createdByName:
            getString(payload.createdByName) ??
            getString(payload.created_by_name) ??
            (isObject(payload.createdBy)
                ? getString(payload.createdBy.username) ??
                getString(payload.createdBy.name) ??
                getString(payload.createdBy.email)
                : null) ??
            (isObject(payload.created_by)
                ? getString(payload.created_by.username) ??
                getString(payload.created_by.name) ??
                getString(payload.created_by.email)
                : null),
        createdAt:
            getString(payload.createdAt) ??
            getString(payload.created_at),
        lastLoginAt:
            getString(payload.lastLoginAt) ??
            getString(payload.last_login_at),
    };
}

function extractCollection(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!isObject(payload)) {
        return [];
    }

    const candidates = [payload.data, payload.items, payload.content, payload.results];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

function buildMutationPayload(input: CreateUserInput | UpdateUserInput) {
    const payload: Record<string, unknown> = {};

    if (typeof input.username === "string") {
        payload.username = input.username.trim();
    }

    if (typeof input.email === "string") {
        payload.email = input.email.trim().toLowerCase();
    }

    if (typeof input.status === "string") {
        payload.status = input.status;
    }

    if (Array.isArray(input.roles)) {
        payload.roles = input.roles
            .map((role) => role.trim())
            .filter((role) => role.length > 0);
    }

    if (
        "cityId" in input &&
        typeof input.cityId === "number" &&
        Number.isFinite(input.cityId)
    ) {
        payload.cityId = input.cityId;
    }

    return payload;
}

export async function listUsers(
    params?: ListUsersParams
): Promise<ManagedUser[]> {
    const query = params
        ? {
            search: params.search,
            role: params.role,
            status: params.status,
        }
        : undefined;

    const payload = await httpClient.get<unknown>(USERS_BASE_PATH, {
        query,
    });

    return extractCollection(payload).map(mapApiUser);
}

export async function createUser(
    input: CreateUserInput
): Promise<ManagedUser> {
    const payload = await httpClient.post<unknown>(
        USERS_BASE_PATH,
        buildMutationPayload(input)
    );

    return mapApiUser(payload);
}

export async function updateUser(
    id: string,
    input: UpdateUserInput
): Promise<ManagedUser> {
    const payload = await httpClient.put<unknown>(
        `${USERS_BASE_PATH}/${id}`,
        buildMutationPayload(input)
    );

    return mapApiUser(payload);
}

/** INACTIVE → ACTIVE (Spring: `PUT /api/users/{id}/activate`). */
export async function activateUser(id: string): Promise<ManagedUser> {
    const payload = await httpClient.put<unknown>(
        `${USERS_BASE_PATH}/${id}/activate`,
        {}
    );

    return mapApiUser(payload);
}

/**
 * Desactiva la cuenta (Spring: `PUT /api/users/{id}/deactivate` → `INACTIVE`).
 * Preferido frente a DELETE /api/users/{id}, que en backend también es borrado lógico pero con semántica REST menos clara.
 */
export async function deactivateUser(id: string): Promise<ManagedUser> {
    const payload = await httpClient.put<unknown>(
        `${USERS_BASE_PATH}/${id}/deactivate`,
        {}
    );

    return mapApiUser(payload);
}
