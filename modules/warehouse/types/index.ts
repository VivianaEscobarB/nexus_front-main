// --- Entidades de Ubicación ---
export interface Country {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  countryId: string;
  name: string;
}

export interface City {
  id: string;
  departmentId: string;
  name: string;
}

// --- Entidades de Bodega ---
export interface WarehouseType {
  id: number;
  name: string;
  description: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  warehouseTypeId: number;
  warehouseTypeName?: string;
  isActive: boolean; // Fundamental para el borrado lógico
}

export interface CreateWarehousePayload {
  name: string;
  address: string;
  warehouseTypeId: number;
  countryId: string;
  departmentId: string;
  cityId: string;
}
