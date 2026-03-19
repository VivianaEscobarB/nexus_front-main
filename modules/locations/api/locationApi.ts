import { httpClient } from "@/shared/api/httpClient";

export interface LocationCountry {
    id: number;
    name: string;
    description?: string | null;
}

export interface LocationRegion {
    id: number;
    name: string;
    description?: string | null;
    countryId: number;
}

export interface LocationCity {
    id: number;
    name: string;
    description?: string | null;
    postalCode?: string | null;
    departmentRegionId: number;
}

export interface WarehouseTypeOption {
    id: number;
    name: string;
    description?: string | null;
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
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

export async function listCountries(): Promise<LocationCountry[]> {
    const payload = await httpClient.get<unknown>("/api/locations/countries");
    return extractCollection(payload)
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id),
            name: String(item.name ?? ""),
            description:
                typeof item.description === "string" ? item.description : null,
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
}

export async function listRegionsByCountry(
    countryId: number
): Promise<LocationRegion[]> {
    const payload = await httpClient.get<unknown>(
        `/api/locations/countries/${countryId}/regions`
    );

    return extractCollection(payload)
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id),
            name: String(item.name ?? ""),
            description:
                typeof item.description === "string" ? item.description : null,
            countryId,
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
}

export async function listCitiesByRegion(
    regionId: number
): Promise<LocationCity[]> {
    const payload = await httpClient.get<unknown>(
        `/api/locations/regions/${regionId}/cities`
    );

    return extractCollection(payload)
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id),
            name: String(item.name ?? ""),
            description:
                typeof item.description === "string" ? item.description : null,
            postalCode:
                typeof item.postalCode === "string" ? item.postalCode : null,
            departmentRegionId: Number(item.departmentRegionId),
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
}

export async function listWarehouseTypes(): Promise<WarehouseTypeOption[]> {
    const payload = await httpClient.get<unknown>("/api/warehouse-types");

    return extractCollection(payload)
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id ?? item.warehouseTypeId ?? item.warehouse_type_id),
            name: String(item.name ?? item.typeName ?? ""),
            description:
                typeof item.description === "string" ? item.description : null,
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
}

