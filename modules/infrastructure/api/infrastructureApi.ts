import { httpClient } from "@/shared/api/httpClient";
import type {
    CreateEntityTypeInput,
    CreateSectorInput,
    CreateStatusCatalogInput,
    CreateSpaceInput,
    CreateWarehouseInput,
    EntityTypeCatalog,
    InfrastructureStatus,
    ListSectorsParams,
    ListSpacesParams,
    ManagedSector,
    ManagedSpace,
    ManagedWarehouse,
    StatusCatalog,
    UpdateEntityTypeInput,
    UpdateSectorInput,
    UpdateStatusCatalogInput,
    UpdateSpaceInput,
    UpdateWarehouseInput,
} from "@/modules/infrastructure/api/infrastructureTypes";

const WAREHOUSES_BASE_PATH = "/api/warehouses";
const SECTORS_BASE_PATH = "/api/sectors";
const SPACES_BASE_PATH = "/api/storage-spaces";
const ENTITY_TYPES_BASE_PATH = "/api/entity-types";
const STATUS_CATALOGS_BASE_PATH = "/api/status-catalogs";

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

function getBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") {
            return true;
        }
        if (normalized === "false" || normalized === "0") {
            return false;
        }
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

function normalizeOperationalStatus(
    value: unknown
): "ACTIVE" | "INACTIVE" | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toUpperCase();
    if (normalized === "ACTIVE" || normalized === "INACTIVE") {
        return normalized;
    }

    return null;
}

/** Código de estado de catálogo / dominio (p. ej. MAINTENANCE) antes del fallback operativo active/inactive. */
function tryInfrastructureStatus(value: unknown): InfrastructureStatus | null {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const normalized = value.trim().toUpperCase() as InfrastructureStatus;
    if (VALID_STATUSES.has(normalized)) {
        return normalized;
    }

    return null;
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

function mapApiEntityType(payload: unknown): EntityTypeCatalog {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un tipo de entidad invalido.");
    }

    const id = getNumber(payload.id ?? payload.entityTypeId ?? payload.value);
    const name =
        getString(payload.name) ??
        getString(payload.code) ??
        getString(payload.entityType) ??
        null;

    if (!id || !name) {
        throw new Error("La API devolvio un tipo de entidad incompleto.");
    }

    return {
        id,
        name,
        description: getString(payload.description) ?? undefined,
    };
}

function mapApiStatusCatalog(payload: unknown): StatusCatalog {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un estado invalido.");
    }

    const id = getNumber(payload.id ?? payload.statusCatalogId ?? payload.value);
    if (!id) {
        throw new Error("La API devolvio un estado sin identificador.");
    }

    return {
        id,
        name:
            getString(payload.name) ??
            getString(payload.statusName) ??
            getString(payload.description) ??
            "",
        code: getString(payload.code) ?? undefined,
        description: getString(payload.description) ?? undefined,
        color: getString(payload.color) ?? undefined,
        isOperational: getBoolean(payload.isOperational) ?? undefined,
        entityTypeId:
            getNumber(payload.entityTypeId) ??
            getNumber(payload.entity_type_id) ??
            undefined,
    };
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

    const nestedCity = isObject(payload.city) ? payload.city : null;
    const nestedRegion =
        isObject(payload.region) ? payload.region
        : nestedCity && isObject(nestedCity.region) ? nestedCity.region
        : null;
    const nestedCountry =
        isObject(payload.country) ? payload.country
        : nestedRegion && isObject(nestedRegion.country) ? nestedRegion.country
        : null;

    const cityIdResolved =
        getNumber(payload.cityId) ??
        getNumber(payload.city_id) ??
        (nestedCity ? getNumber(nestedCity.id) : null) ??
        null;

    const regionIdResolved =
        getNumber(payload.regionId) ??
        getNumber(payload.region_id) ??
        getNumber(payload.departmentId) ??
        getNumber(payload.department_id) ??
        (nestedRegion ? getNumber(nestedRegion.id) : null) ??
        (nestedCity && isObject(nestedCity.region)
            ? getNumber((nestedCity.region as { id?: unknown }).id)
            : null) ??
        null;

    const countryIdResolved =
        getNumber(payload.countryId) ??
        getNumber(payload.country_id) ??
        (nestedCountry ? getNumber(nestedCountry.id) : null) ??
        (nestedRegion && isObject(nestedRegion.country)
            ? getNumber((nestedRegion.country as { id?: unknown }).id)
            : null) ??
        null;

    return {
        id: String(id),
        code,
        name,
        address:
            getString(payload.address) ??
            getString(payload.location) ??
            getString(payload.description) ??
            "Sin direccion registrada",
        countryId: countryIdResolved,
        regionId: regionIdResolved,
        cityId: cityIdResolved,
        cityName:
            getString(payload.cityName) ??
            (isObject(payload.city) ? getString(payload.city.name) : null) ??
            null,
        warehouseTypeId:
            getNumber(payload.warehouseTypeId) ??
            getNumber(payload.warehouse_type_id) ??
            getNumber(payload.typeId) ??
            (isObject(payload.warehouseType) ? getNumber(payload.warehouseType.id) : null) ??
            null,
        typeName:
            getString(payload.typeName) ??
            getString(payload.type_name) ??
            (isObject(payload.warehouseType) ? getString(payload.warehouseType.name) : null) ??
            null,
        totalCapacityM2:
            getNumber(payload.totalCapacityM2) ??
            getNumber(payload.capacityM2) ??
            null,
        availableCapacityM2:
            getNumber(payload.availableCapacityM2) ??
            getNumber(payload.remainingCapacityM2) ??
            null,
        status: (() => {
            const catalogStatus =
                tryInfrastructureStatus(payload.status) ??
                tryInfrastructureStatus(payload.statusCode) ??
                tryInfrastructureStatus(
                    isObject(payload.statusCatalog)
                        ? (payload.statusCatalog as { code?: unknown }).code
                        : undefined
                );

            if (catalogStatus) {
                return catalogStatus;
            }

            return normalizeStatus(
                normalizeOperationalStatus(payload.operationalStatus) ??
                    (payload.active === false ? "INACTIVE" : "ACTIVE"),
                "ACTIVE"
            );
        })(),
        statusCatalogId:
            getNumber(payload.statusCatalogId) ??
            getNumber(payload.status_catalog_id) ??
            undefined,
        active: typeof payload.active === "boolean" ? payload.active : null,
        operationalStatus: normalizeOperationalStatus(payload.operationalStatus),
        operationalLabel:
            getString(payload.operationalLabel) ??
            getString(payload.operational_label) ??
            null,
        statusName:
            getString(payload.statusName) ??
            getString(payload.status_name) ??
            null,
    };
}

function resolveSectorSpaceStatus(
    payload: Record<string, unknown>,
    defaultStatus: InfrastructureStatus
): { status: InfrastructureStatus; statusName: string | null } {
    const nestedCatalog = isObject(payload.statusCatalog)
        ? (payload.statusCatalog as Record<string, unknown>)
        : null;

    const statusName =
        getString(payload.statusName) ??
        getString(payload.status_name) ??
        getString(nestedCatalog?.name) ??
        null;

    const catalogStatus =
        tryInfrastructureStatus(payload.status) ??
        tryInfrastructureStatus(payload.statusCode) ??
        tryInfrastructureStatus(nestedCatalog?.code);

    if (catalogStatus) {
        return { status: catalogStatus, statusName };
    }

    if (normalizeOperationalStatus(payload.operationalStatus) === "INACTIVE") {
        return { status: "INACTIVE", statusName };
    }

    if (payload.active === false) {
        return { status: "INACTIVE", statusName };
    }

    return { status: defaultStatus, statusName };
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

    const { status, statusName } = resolveSectorSpaceStatus(payload, "ACTIVE");

    return {
        id: String(id),
        code,
        name,
        warehouseId,
        warehouseName: getString(payload.warehouseName) ?? null,
        description,
        capacityM2: getNumber(payload.capacityM2) ?? null,
        status,
        statusName,
        statusCatalogId:
            getNumber(payload.statusCatalogId) ??
            getNumber(payload.status_catalog_id) ??
            undefined,
    };
}

function mapApiSpace(payload: unknown): ManagedSpace {
    if (!isObject(payload)) {
        throw new Error("La API devolvio un espacio invalido.");
    }

    const id = payload.id ?? payload.space_id ?? payload.spaceId;
    const code = getString(payload.code) ?? getString(payload.space_code) ?? getString(payload.spaceCode);
    const nestedSector = isObject(payload.sector) ? payload.sector : null;
    const nestedWarehouse = isObject(payload.warehouse) ? payload.warehouse : null;
    const sectorId =
        getString(payload.sectorId) ??
        getString(payload.sector_id) ??
        String(payload.sectorId ?? payload.sector_id ?? nestedSector?.id ?? "");
    const aisle = getString(payload.aisle);
    const row = getString(payload.row);
    const level = getString(payload.level);
    const position = getString(payload.position);
    const description =
        getString(payload.description) ??
        (
            [aisle, row, level, position]
                .filter((segment): segment is string => Boolean(segment))
                .join("/") || null
        );

    const name =
        getString(payload.name) ??
        code ??
        description ??
        "Espacio";

    if (!id || !code) {
        throw new Error("La API devolvio un espacio incompleto.");
    }

    const { status, statusName } = resolveSectorSpaceStatus(payload, "AVAILABLE");

    return {
        id: String(id),
        code,
        name,
        warehouseId:
            getString(payload.warehouseId) ??
            getString(payload.warehouse_id) ??
            String(payload.warehouseId ?? payload.warehouse_id ?? nestedWarehouse?.id ?? ""),
        warehouseName:
            getString(payload.warehouseName) ??
            getString(payload.warehouse_name) ??
            (nestedWarehouse ? getString(nestedWarehouse.name) : null) ??
            null,
        sectorId: sectorId ?? "",
        sectorName:
            getString(payload.sectorName) ??
            getString(payload.sector_name) ??
            (nestedSector ? getString(nestedSector.name) : null) ??
            null,
        description,
        aisle,
        row,
        level,
        position,
        capacityM2: getNumber(payload.capacityM2) ?? null,
        temperatureControl:
            getBoolean(payload.temperatureControl) ??
            getBoolean(payload.temperature_control) ??
            null,
        humidityControl:
            getBoolean(payload.humidityControl) ??
            getBoolean(payload.humidity_control) ??
            null,
        storageSpaceTypeId:
            getNumber(payload.storageSpaceTypeId) ??
            getNumber(payload.storage_space_type_id) ??
            undefined,
        status,
        statusName,
        statusCatalogId:
            getNumber(payload.statusCatalogId) ??
            getNumber(payload.status_catalog_id) ??
            undefined,
    };
}

function buildWarehousePayload(input: CreateWarehouseInput | UpdateWarehouseInput) {
    return compactRecord({
        code: input.code?.trim(),
        name: input.name?.trim(),
        totalCapacityM2: input.totalCapacityM2,
        location: input.location?.trim(),
        countryId: input.countryId ? Number(input.countryId) : undefined,
        regionId: input.regionId ? Number(input.regionId) : undefined,
        cityId: input.cityId ? Number(input.cityId) : undefined,
        statusCatalogId: input.statusCatalogId,
        warehouseTypeId: input.warehouseTypeId,
    });
}

function buildSectorPayload(input: CreateSectorInput | UpdateSectorInput) {
    return compactRecord({
        warehouseId: input.warehouseId ? Number(input.warehouseId) : undefined,
        code: input.code?.trim(),
        name: input.name?.trim(),
        description: input.description?.trim(),
        capacityM2: input.capacityM2,
        statusCatalogId: input.statusCatalogId,
    });
}

function buildSpacePayload(input: CreateSpaceInput | UpdateSpaceInput) {
    return compactRecord({
        sectorId: input.sectorId ? Number(input.sectorId) : undefined,
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
        `${STATUS_CATALOGS_BASE_PATH}/entity-type/${entityTypeId}`
    );

    const items = extractCollection(payload);
    return items.filter(isObject).map(mapApiStatusCatalog);
}

export async function listStatusCatalogs(): Promise<StatusCatalog[]> {
    const payload = await httpClient.get<unknown>(STATUS_CATALOGS_BASE_PATH);
    return extractCollection(payload).filter(isObject).map(mapApiStatusCatalog);
}

export async function updateStatusCatalog(
    id: number,
    input: UpdateStatusCatalogInput
): Promise<StatusCatalog> {
    const payload = await httpClient.put<unknown>(
        `${STATUS_CATALOGS_BASE_PATH}/${id}`,
        compactRecord({
            code: input.code?.trim(),
            description: input.description?.trim(),
            color: input.color?.trim(),
            isOperational: input.isOperational,
            entityTypeId: input.entityTypeId,
        })
    );
    return mapApiStatusCatalog(payload);
}

export async function deleteStatusCatalog(id: number): Promise<void> {
    await httpClient.delete<void>(`${STATUS_CATALOGS_BASE_PATH}/${id}`);
}

export async function createStatusCatalog(
    input: CreateStatusCatalogInput
): Promise<StatusCatalog> {
    const payload = await httpClient.post<unknown>(
        STATUS_CATALOGS_BASE_PATH,
        compactRecord({
            code: input.code?.trim(),
            description: input.description?.trim(),
            color: input.color?.trim(),
            isOperational: input.isOperational,
            entityTypeId: input.entityTypeId,
        })
    );
    return mapApiStatusCatalog(payload);
}

export async function listEntityTypes(): Promise<EntityTypeCatalog[]> {
    const payload = await httpClient.get<unknown>(ENTITY_TYPES_BASE_PATH);
    return extractCollection(payload).filter(isObject).map(mapApiEntityType);
}

export async function createEntityType(
    input: CreateEntityTypeInput
): Promise<EntityTypeCatalog> {
    const payload = await httpClient.post<unknown>(
        ENTITY_TYPES_BASE_PATH,
        compactRecord({
            name: input.name?.trim(),
            description: input.description?.trim(),
        })
    );
    return mapApiEntityType(payload);
}

export async function updateEntityType(
    id: number,
    input: UpdateEntityTypeInput
): Promise<EntityTypeCatalog> {
    const payload = await httpClient.put<unknown>(
        `${ENTITY_TYPES_BASE_PATH}/${id}`,
        compactRecord({
            name: input.name?.trim(),
            description: input.description?.trim(),
        })
    );
    return mapApiEntityType(payload);
}

export async function deleteEntityType(id: number): Promise<void> {
    await httpClient.delete<void>(`${ENTITY_TYPES_BASE_PATH}/${id}`);
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
    const payload = await httpClient.put<unknown>(
        `${WAREHOUSES_BASE_PATH}/${id}`,
        buildWarehousePayload(input)
    );

    return mapApiWarehouse(payload);
}

export async function deleteWarehouse(id: string): Promise<ManagedWarehouse> {
    const payload = await httpClient.delete<unknown>(`${WAREHOUSES_BASE_PATH}/${id}`);
    return mapApiWarehouse(payload);
}

export async function enableWarehouse(id: string): Promise<ManagedWarehouse> {
    const payload = await httpClient.patch<unknown>(
        `${WAREHOUSES_BASE_PATH}/${id}/enable`,
        {}
    );
    return mapApiWarehouse(payload);
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
