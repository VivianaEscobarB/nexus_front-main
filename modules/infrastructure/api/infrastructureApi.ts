import { httpClient } from "@/shared/api/httpClient";
import type {
    CreateSectorInput,
    CreateSpaceInput,
    CreateWarehouseInput,
    InfrastructureStatus,
    ListSectorsParams,
    ListSpacesParams,
    ManagedSector,
    ManagedSpace,
    ManagedWarehouse,
    UpdateSectorInput,
    UpdateSpaceInput,
    UpdateWarehouseInput,
} from "@/modules/infrastructure/api/infrastructureTypes";

const WAREHOUSES_BASE_PATH = "/api/warehouses";
const SECTORS_BASE_PATH = "/api/sectors";
const SPACES_BASE_PATH = "/api/spaces";

const VALID_STATUSES = new Set<InfrastructureStatus>([
    "ACTIVE",
    "INACTIVE",
    "MAINTENANCE",
    "AVAILABLE",
    "OCCUPIED",
    "RESERVED",
]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function normalizeStatus(
    value: unknown,
    fallback: InfrastructureStatus
): InfrastructureStatus {
    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase() as InfrastructureStatus;
        if (VALID_STATUSES.has(normalized)) {
            return normalized;
        }
    }

    return fallback;
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
        payload.warehouses,
        payload.sectors,
        payload.spaces,
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

function mapApiWarehouse(payload: unknown): ManagedWarehouse {
    if (!isObject(payload)) {
        throw new Error("La API devolvio una bodega invalida.");
    }

    const id = payload.id;
    const name = getString(payload.name);

    if (!id || !name) {
        throw new Error("La API devolvio una bodega incompleta.");
    }

    return {
        id: String(id),
        code: `WH-${id}`, // Generado en frontend para consistencia visual si no viene del back
        name,
        address: getString(payload.location) ?? "Sin ubicacion registrada",
        cityName: null,
        typeName: null,
        totalCapacityM2: getNumber(payload.totalCapacityM2),
        availableCapacityM2: getNumber(payload.availableCapacityM2),
        status: normalizeStatus(payload.status, "ACTIVE"),
    };
}

function mapApiSector(payload: unknown): ManagedSector {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un sector invalido.");
    }

    const id = payload.id ?? payload.sector_id ?? payload.sectorId;
    const name =
        getString(payload.name) ??
        getString(payload.sector_name) ??
        getString(payload.sectorName);

    if (!id || !name) {
        throw new Error("La API devolvio un sector incompleto.");
    }

    const warehouseObject =
        isObject(payload.warehouse) ? payload.warehouse :
            isObject(payload.parentWarehouse) ? payload.parentWarehouse : null;

    const warehouseId =
        getString(payload.warehouseId) ??
        getString(payload.warehouse_id) ??
        getString(warehouseObject?.warehouse_id) ??
        getString(warehouseObject?.id) ??
        "";

    return {
        id: String(id),
        code:
            getString(payload.code) ??
            getString(payload.sector_code) ??
            getString(payload.sectorCode) ??
            `SEC-${id}`,
        name,
        warehouseId,
        warehouseName:
            getString(payload.warehouseName) ??
            getString(warehouseObject?.name) ??
            getString(warehouseObject?.warehouse_name),
        description: getString(payload.description),
        capacityM2:
            getNumber(payload.capacityM2) ??
            getNumber(payload.capacity_m2) ??
            getNumber(payload.totalCapacityM2) ??
            getNumber(payload.total_capacity_m2),
        status: normalizeStatus(payload.status, "ACTIVE"),
    };
}

function mapApiSpace(payload: unknown): ManagedSpace {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un espacio invalido.");
    }

    const id = payload.id ?? payload.space_id ?? payload.spaceId;
    const name =
        getString(payload.name) ??
        getString(payload.space_name) ??
        getString(payload.spaceName);

    if (!id || !name) {
        throw new Error("La API devolvio un espacio incompleto.");
    }

    const sectorObject =
        isObject(payload.sector) ? payload.sector :
            isObject(payload.parentSector) ? payload.parentSector : null;
    const warehouseObject =
        isObject(payload.warehouse) ? payload.warehouse :
            isObject(payload.parentWarehouse) ? payload.parentWarehouse : null;

    return {
        id: String(id),
        code:
            getString(payload.code) ??
            getString(payload.space_code) ??
            getString(payload.spaceCode) ??
            `SP-${id}`,
        name,
        warehouseId:
            getString(payload.warehouseId) ??
            getString(payload.warehouse_id) ??
            getString(warehouseObject?.warehouse_id) ??
            getString(warehouseObject?.id) ??
            getString(sectorObject?.warehouse_id) ??
            "",
        warehouseName:
            getString(payload.warehouseName) ??
            getString(warehouseObject?.name) ??
            getString(warehouseObject?.warehouse_name),
        sectorId:
            getString(payload.sectorId) ??
            getString(payload.sector_id) ??
            getString(sectorObject?.sector_id) ??
            getString(sectorObject?.id) ??
            "",
        sectorName:
            getString(payload.sectorName) ??
            getString(sectorObject?.name) ??
            getString(sectorObject?.sector_name),
        description: getString(payload.description),
        capacityM2:
            getNumber(payload.capacityM2) ??
            getNumber(payload.capacity_m2) ??
            getNumber(payload.areaM2) ??
            getNumber(payload.area_m2),
        status: normalizeStatus(
            payload.status,
            Boolean(payload.occupied) ? "OCCUPIED" : "AVAILABLE"
        ),
    };
}

function buildWarehousePayload(input: CreateWarehouseInput | UpdateWarehouseInput) {
    return compactRecord({
        name: input.name?.trim(),
        location: input.address?.trim(), // Frontend uses 'address', backend DTO expects 'location'
        totalCapacityM2: input.totalCapacityM2
    });
}

function buildSectorPayload(input: CreateSectorInput | UpdateSectorInput) {
    return compactRecord({
        warehouseId: input.warehouseId?.trim(),
        code: input.code?.trim(),
        name: input.name?.trim(),
        description: input.description?.trim(),
        capacityM2: input.capacityM2,
        status: input.status,
    });
}

function buildSpacePayload(input: CreateSpaceInput | UpdateSpaceInput) {
    return compactRecord({
        warehouseId: input.warehouseId?.trim(),
        sectorId: input.sectorId?.trim(),
        code: input.code?.trim(),
        name: input.name?.trim(),
        description: input.description?.trim(),
        capacityM2: input.capacityM2,
        status: input.status,
    });
}

export async function listWarehouses(): Promise<ManagedWarehouse[]> {
    const payload = await httpClient.get<unknown>(WAREHOUSES_BASE_PATH);
    return extractCollection(payload).map(mapApiWarehouse);
}

export async function createWarehouse(
    input: CreateWarehouseInput
): Promise<ManagedWarehouse> {
    const payload = await httpClient.post<unknown>(
        WAREHOUSES_BASE_PATH,
        buildWarehousePayload(input)
    );

    return mapApiWarehouse(payload);
}

export async function updateWarehouse(
    id: string,
    input: UpdateWarehouseInput
): Promise<ManagedWarehouse> {
    const payload = await httpClient.patch<unknown>(
        `${WAREHOUSES_BASE_PATH}/${id}`,
        buildWarehousePayload(input)
    );

    return mapApiWarehouse(payload);
}

export async function deleteWarehouse(id: string): Promise<void> {
    await httpClient.delete<void>(`${WAREHOUSES_BASE_PATH}/${id}`);
}

export async function listSectors(
    params?: ListSectorsParams
): Promise<ManagedSector[]> {
    const payload = await httpClient.get<unknown>(SECTORS_BASE_PATH, {
        query: params ? { warehouseId: params.warehouseId } : undefined,
    });

    return extractCollection(payload).map(mapApiSector);
}

export async function createSector(
    input: CreateSectorInput
): Promise<ManagedSector> {
    const payload = await httpClient.post<unknown>(
        SECTORS_BASE_PATH,
        buildSectorPayload(input)
    );

    return mapApiSector(payload);
}

export async function updateSector(
    id: string,
    input: UpdateSectorInput
): Promise<ManagedSector> {
    const payload = await httpClient.patch<unknown>(
        `${SECTORS_BASE_PATH}/${id}`,
        buildSectorPayload(input)
    );

    return mapApiSector(payload);
}

export async function deleteSector(id: string): Promise<void> {
    await httpClient.delete<void>(`${SECTORS_BASE_PATH}/${id}`);
}

export async function listSpaces(
    params?: ListSpacesParams
): Promise<ManagedSpace[]> {
    const payload = await httpClient.get<unknown>(SPACES_BASE_PATH, {
        query: params
            ? {
                warehouseId: params.warehouseId,
                sectorId: params.sectorId,
            }
            : undefined,
    });

    return extractCollection(payload).map(mapApiSpace);
}

export async function createSpace(
    input: CreateSpaceInput
): Promise<ManagedSpace> {
    const payload = await httpClient.post<unknown>(
        SPACES_BASE_PATH,
        buildSpacePayload(input)
    );

    return mapApiSpace(payload);
}

export async function updateSpace(
    id: string,
    input: UpdateSpaceInput
): Promise<ManagedSpace> {
    const payload = await httpClient.patch<unknown>(
        `${SPACES_BASE_PATH}/${id}`,
        buildSpacePayload(input)
    );

    return mapApiSpace(payload);
}

export async function deleteSpace(id: string): Promise<void> {
    await httpClient.delete<void>(`${SPACES_BASE_PATH}/${id}`);
}
