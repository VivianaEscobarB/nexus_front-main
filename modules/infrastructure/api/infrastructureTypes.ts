export type InfrastructureStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "MAINTENANCE"
    | "AVAILABLE"
    | "OCCUPIED"
    | "RESERVED";

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
    capacityM2: number | null;
    status: InfrastructureStatus;
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
    address: string;
    cityId?: string;
    warehouseTypeId?: string;
    totalCapacityM2?: number;
    availableCapacityM2?: number;
    status?: InfrastructureStatus;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export interface CreateSectorInput {
    warehouseId: string;
    code: string;
    name: string;
    description?: string;
    capacityM2?: number;
    status?: InfrastructureStatus;
}

export type UpdateSectorInput = Partial<CreateSectorInput>;

export interface CreateSpaceInput {
    warehouseId: string;
    sectorId: string;
    code: string;
    name: string;
    description?: string;
    capacityM2?: number;
    status?: InfrastructureStatus;
}

export type UpdateSpaceInput = Partial<CreateSpaceInput>;
