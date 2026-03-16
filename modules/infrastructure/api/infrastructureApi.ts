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
const SPACES_BASE_PATH = "/api/storage-spaces";

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

    const id = payload.id ?? payload.warehouse_id ?? payload.warehouseId;
    const name =
        getString(payload.name) ??
        getString(payload.warehouse_name) ??
        getString(payload.warehouseName) ??
        getString(payload.code);

    if (!id || !name) {
        throw new Error("La API devolvio una bodega incompleta.");
    }

    const code =
        getString(payload.code) ??
        getString(payload.warehouse_code) ??
        getString(payload.warehouseCode) ??
        `WH-${id}`;

    return {
        id: String(id),
        code,
        name,
        address:
            getString(payload.address) ??
            getString(payload.location) ??
            getString(payload.description) ??
            "Sin direccion registrada",
        cityName:
            getString(payload.cityName) ??
            (isObject(payload.city) ? getString(payload.city.name) : null) ??
            null,
        typeName:
            getString(payload.typeName) ??
            getString(payload.type_name) ??
            null,
        totalCapacityM2:
            getNumber(payload.totalCapacityM2) ??
            getNumber(payload.capacityM2) ??
            null,
        availableCapacityM2:
            getNumber(payload.availableCapacityM2) ??
            getNumber(payload.remainingCapacityM2) ??
            null,
        status: normalizeStatus(
            getString(payload.statusName) ?? getString(payload.status) ?? "ACTIVE",
            "ACTIVE"
        ),
        statusCatalogId: getNumber(payload.statusCatalogId) ?? getNumber(payload.status_catalog_id) ?? null,
    };
}

function mapApiSector(payload: unknown): ManagedSector {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un sector invalido.");
    }

    const id = payload.id ?? payload.sector_id ?? payload.sectorId;
    const code =
        getString(payload.code) ??
        getString(payload.sector_code) ??
        getString(payload.sectorCode) ??
        `SEC-${id}`;
    const description = getString(payload.description);
    const name =
        getString(payload.name) ??
        description ??
        getString(payload.code) ??
        code;

    if (!id || !name) {
        throw new Error("La API devolvio un sector incompleto.");
    }

    const warehouseId =
        getString(payload.warehouseId) ??
        getString(payload.warehouse_id) ??
        String(payload.warehouseId ?? payload.warehouse_id ?? payload.warehouseId ?? "");

    return {
        id: String(id),
        code,
        name,
        warehouseId,
        warehouseName: getString(payload.warehouseName) ?? null,
        description,
        capacityM2: getNumber(payload.capacityM2) ?? null,
        status: normalizeStatus(
            getString(payload.statusName) ?? getString(payload.status) ?? (payload.active === false ? "INACTIVE" : "ACTIVE"),
            "ACTIVE"
        ),
        statusCatalogId: getNumber(payload.statusCatalogId) ?? getNumber(payload.status_catalog_id) ?? null,
    };
}

function mapApiSpace(payload: unknown): ManagedSpace {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un espacio invalido.");
    }

    const id = payload.id ?? payload.space_id ?? payload.spaceId;
    const code = getString(payload.code) ?? getString(payload.space_code) ?? getString(payload.spaceCode);
    const sectorId =
        getString(payload.sectorId) ??
        getString(payload.sector_id) ??
        String(payload.sectorId ?? payload.sector_id ?? payload.sector?.id ?? "");

    const name =
        getString(payload.name) ??
        code ??
        getString(payload.description) ??
        "Espacio";

    if (!id || !code) {
        throw new Error("La API devolvio un espacio incompleto.");
    }

    return {
        id: String(id),
        code,
        name,
        warehouseId: getString(payload.warehouseId) ?? "",
        warehouseName: getString(payload.warehouseName) ?? null,
        sectorId: sectorId ?? "",
        sectorName: getString(payload.sectorName) ?? null,
        description: (
            getString(payload.description) ??
            [getString(payload.aisle), getString(payload.row), getString(payload.level), getString(payload.position)]
                .filter(Boolean)
                .join("/")
        ) || null,
        capacityM2: getNumber(payload.capacityM2) ?? null,
        status: normalizeStatus(
            getString(payload.statusName) ?? getString(payload.status) ?? (payload.active === false ? "INACTIVE" : "AVAILABLE"),
            "AVAILABLE"
        ),
        statusCatalogId: getNumber(payload.statusCatalogId) ?? getNumber(payload.status_catalog_id) ?? null,
    };
}

function buildWarehousePayload(input: CreateWarehouseInput | UpdateWarehouseInput) {
    return compactRecord({
        code: input.code?.trim(),
        name: input.name?.trim(),
        totalCapacityM2: input.totalCapacityM2,
        location: input.location?.trim(),
        cityId: input.cityId ? Number(input.cityId) : undefined,
        statusCatalogId: input.statusCatalogId,
        warehouseTypeId: input.warehouseTypeId,
    });
}

function buildSectorPayload(input: CreateSectorInput | UpdateSectorInput) {
    return compactRecord({
        warehouseId: Number(input.warehouseId),
        code: input.code?.trim(),
        description: input.description?.trim(),
        statusCatalogId: input.statusCatalogId,
    });
}

function buildSpacePayload(input: CreateSpaceInput | UpdateSpaceInput) {
    return compactRecord({
        sectorId: Number(input.sectorId),
        aisle: input.aisle?.trim(),
        row: input.row?.trim(),
        level: input.level?.trim(),
        position: input.position?.trim(),
        capacityM2: input.capacityM2,
        temperatureControl: input.temperatureControl,
        humidityControl: input.humidityControl,
        storageSpaceTypeId: input.storageSpaceTypeId,
        statusCatalogId: input.statusCatalogId,
    });
}

export async function listStatusCatalogsByEntityType(
    entityTypeId: number
): Promise<StatusCatalog[]> {
    const payload = await httpClient.get<unknown>(
        `/api/status-catalogs/entity-type/${entityTypeId}`
    );

    const items = extractCollection(payload);
    return items
        .filter(isObject)
        .map((item) => ({
            id: Number(item.id ?? item.statusCatalogId ?? item.value),
            name:
                getString(item.name) ?? getString(item.statusName) ??
                getString(item.description) ?? "",
            code: getString(item.code) ?? null,
            description: getString(item.description) ?? null,
        }))
        .filter((item) => Number.isFinite(item.id));
}

export async function createStatusCatalog(
    input: CreateStatusCatalogInput
): Promise<StatusCatalog> {
    const payload = await httpClient.post<unknown>(
        "/api/status-catalogs",
        compactRecord({
            code: input.code?.trim(),
            description: input.description?.trim(),
            color: input.color?.trim(),
            isOperational: input.isOperational,
            entityTypeId: input.entityTypeId,
        })
    );

    if (!isObject(payload)) {
        throw new Error("La API devolvio un estado invalido.");
    }

    return {
        id: Number(payload.id ?? payload.statusCatalogId ?? payload.value),
        name:
            getString(payload.name) ?? getString(payload.statusName) ??
            getString(payload.description) ?? "",
        code: getString(payload.code) ?? null,
        description: getString(payload.description) ?? null,
    };
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
    if (!params?.warehouseId) {
        return [];
    }

    const payload = await httpClient.get<unknown>(
        `${SECTORS_BASE_PATH}/warehouse/${params.warehouseId}`
    );

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
    if (!params?.sectorId) {
        return [];
    }

    const payload = await httpClient.get<unknown>(
        `${SPACES_BASE_PATH}/sector/${params.sectorId}`
    );

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
