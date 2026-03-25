export type InfrastructureStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "MAINTENANCE"
    | "AVAILABLE"
    | "OCCUPIED"
    | "RESERVED";

export interface StatusCatalog {
    id: number;
    name: string;
    code?: string;
    description?: string;
}

export interface ManagedWarehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    cityName: string | null;
    typeName: string | null;
    totalCapacityM2: number | null;
    availableCapacityM2: number | null;
    status: InfrastructureStatus;
    statusCatalogId?: number;
    active: boolean | null;
    operationalStatus: "ACTIVE" | "INACTIVE" | null;
    operationalLabel: string | null;
    statusName: string | null;
}

export interface ManagedSector {
    id: string;
    code: string;
    name: string;
    warehouseId: string;
    warehouseName: string | null;
    description: string | null;
    capacityM2: number | null;
    status: InfrastructureStatus;
    statusCatalogId?: number;
}

export interface ManagedSpace {
    id: string;
    code: string;
    name: string;
    warehouseId: string;
    warehouseName: string | null;
    sectorId: string;
    sectorName: string | null;
    description: string | null;
    aisle: string | null;
    row: string | null;
    level: string | null;
    position: string | null;
    capacityM2: number | null;
    temperatureControl: boolean | null;
    humidityControl: boolean | null;
    storageSpaceTypeId?: number;
    status: InfrastructureStatus;
    statusCatalogId?: number;
}

export interface ListSectorsParams {
    warehouseId?: string;
}

export interface ListSpacesParams {
    warehouseId?: string;
    sectorId?: string;
}

export interface CreateWarehouseInput {
    code: string;
    name: string;
    location: string;
    cityId?: string;
    statusCatalogId?: number;
    warehouseTypeId?: number;
    totalCapacityM2?: number;
    availableCapacityM2?: number;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export interface CreateSectorInput {
    warehouseId: string;
    code: string;
    name: string;
    description?: string;
    capacityM2?: number;
    statusCatalogId?: number;
}

export type UpdateSectorInput = Partial<CreateSectorInput>;

export interface CreateSpaceInput {
    sectorId: string;
    aisle: string;
    row: string;
    level: string;
    position: string;
    capacityM2?: number;
    temperatureControl?: boolean;
    humidityControl?: boolean;
    storageSpaceTypeId?: number;
    statusCatalogId?: number;
}

export type UpdateSpaceInput = Partial<CreateSpaceInput>;

export interface CreateStatusCatalogInput {
    code: string;
    description: string;
    color: string;
    isOperational: boolean;
    entityTypeId: number;
}

