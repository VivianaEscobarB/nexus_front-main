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
        clientName:
            getString(payload.clientName) ??
            getString(payload.client_name) ??
            (isObject(payload.client)
                ? getString(payload.client.business_name) ??
                getString(payload.client.businessName) ??
                getString(payload.client.name)
                : null),
        createdAt: getString(payload.createdAt),
        lastLoginAt: getString(payload.lastLoginAt),
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

    if (typeof input.password === "string" && input.password.trim().length > 0) {
        payload.password = input.password;
    }

    if (typeof input.status === "string") {
        payload.status = input.status;
    }

    if (Array.isArray(input.roles)) {
        payload.roles = input.roles;
    }

    if ("clientId" in input) {
        payload.clientId = input.clientId?.trim() || null;
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
    const payload = await httpClient.patch<unknown>(
        `${USERS_BASE_PATH}/${id}`,
        buildMutationPayload(input)
    );

    return mapApiUser(payload);
}

export async function updateUserStatus(
    id: string,
    status: ManagedUserStatus
): Promise<ManagedUser> {
    const payload = await httpClient.patch<unknown>(`${USERS_BASE_PATH}/${id}`, {
        status,
    });

    return mapApiUser(payload);
}

export async function deleteUser(id: string): Promise<void> {
    await httpClient.delete<void>(`${USERS_BASE_PATH}/${id}`);
}
