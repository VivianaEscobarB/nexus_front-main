import { httpClient } from "@/shared/api/httpClient";
import type {
    CreateClientInput,
    ManagedClient,
    ManagedClientStatus,
    UpdateClientInput,
} from "@/modules/clients/api/clientTypes";

const CLIENTS_BASE_PATH = "/api/clients";
const VALID_STATUSES = new Set<ManagedClientStatus>(["ACTIVE", "INACTIVE"]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: unknown): ManagedClientStatus {
    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase() as ManagedClientStatus;
        if (VALID_STATUSES.has(normalized)) {
            return normalized;
        }
    }

    return "ACTIVE";
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
        payload.clients,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

function compactRecord<T extends Record<string, unknown>>(record: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "")
    ) as Partial<T>;
}

function mapApiClient(payload: unknown): ManagedClient {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un cliente invalido.");
    }

    const id = payload.id ?? payload.client_id ?? payload.clientId;
    const businessName =
        getString(payload.businessName) ??
        getString(payload.business_name) ??
        getString(payload.companyName) ??
        getString(payload.company_name) ??
        getString(payload.name);
    const email = getString(payload.email);

    if (!id || !businessName || !email) {
        throw new Error("La API devolvio un cliente incompleto.");
    }

    return {
        id: String(id),
        name:
            getString(payload.name) ??
            getString(payload.contactName) ??
            getString(payload.contact_name) ??
            businessName,
        email,
        phone: getString(payload.phone),
        documentType:
            getString(payload.documentType) ??
            getString(payload.document_type),
        documentNumber:
            getString(payload.documentNumber) ??
            getString(payload.document_number),
        businessName,
        address: getString(payload.address),
        cityId:
            getNumber(payload.cityId) ??
            getNumber(payload.city_id) ??
            (isObject(payload.city) ? getNumber(payload.city.id) : null),
        status: normalizeStatus(payload.status),
        createdAt:
            getString(payload.createdAt) ??
            getString(payload.created_at),
        updatedAt:
            getString(payload.updatedAt) ??
            getString(payload.updated_at),
    };
}

function buildClientPayload(input: CreateClientInput | UpdateClientInput) {
    const payload = compactRecord({
        name: input.name?.trim(),
        email: input.email?.trim().toLowerCase(),
        phone: input.phone?.trim(),
        documentType: input.documentType?.trim(),
        documentNumber: input.documentNumber?.trim(),
        businessName: input.businessName?.trim(),
        address: input.address?.trim(),
        status: input.status,
    });

    if (
        "cityId" in input &&
        typeof input.cityId === "number" &&
        Number.isFinite(input.cityId)
    ) {
        return {
            ...payload,
            cityId: input.cityId,
        };
    }

    return payload;
}

export async function listClients(): Promise<ManagedClient[]> {
    const payload = await httpClient.get<unknown>(CLIENTS_BASE_PATH);
    return extractCollection(payload).map(mapApiClient);
}

export async function createClient(
    input: CreateClientInput
): Promise<ManagedClient> {
    const payload = await httpClient.post<unknown>(
        CLIENTS_BASE_PATH,
        buildClientPayload(input)
    );

    return mapApiClient(payload);
}

export async function updateClient(
    id: string,
    input: UpdateClientInput
): Promise<ManagedClient> {
    const payload = await httpClient.patch<unknown>(
        `${CLIENTS_BASE_PATH}/${id}`,
        buildClientPayload(input)
    );

    return mapApiClient(payload);
}
