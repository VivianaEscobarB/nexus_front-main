// =============================================================================
// NEXUS — Interfaces centrales de TypeScript
// =============================================================================
// Todas las interfaces y enumeraciones del dominio se exportan desde aquí.
// Los servicios en /services y los hooks en /hooks deben importar desde @/types.
// =============================================================================

// ---------------------------------------------------------------------------
// Enumeraciones
// ---------------------------------------------------------------------------

/** Estados posibles de un producto en el inventario. */
export enum ProductStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    DISCONTINUED = "DISCONTINUED",
}

/** Tipos de movimiento dentro de la bodega. */
export enum MovementType {
    ENTRY = "ENTRY",       // Ingreso de mercancía
    EXIT = "EXIT",         // Salida / despacho
    TRANSFER = "TRANSFER", // Traslado entre bodegas
    ADJUSTMENT = "ADJUSTMENT", // Ajuste de inventario (conteo físico)
    RETURN = "RETURN",     // Devolución de cliente o proveedor
}

/** Roles del usuario activos en el sistema. */
export enum UserRole {
    ADMIN = "ADMIN",                                // Administrador del sistema
    WAREHOUSE_SUPERVISOR = "WAREHOUSE_SUPERVISOR", // Supervisor de bodega
    WAREHOUSE_OPERATOR = "WAREHOUSE_OPERATOR",     // Operador de bodega
    SALES_AGENT = "SALES_AGENT",                    // Agente de venta
    CLIENT = "CLIENT",                              // Cliente
}

// ---------------------------------------------------------------------------
// Entidades de la Base de Datos (Según ERD)
// ---------------------------------------------------------------------------

export interface Role {
    role_id: string;
    role_name: string;
    role_description: string | null;
}

export interface User {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    roles: Role[]; // Obtenido por el JOIN de User_Role
    client_id?: string | null;
    client?: Client | null;
    // Mantenido para retrocompatibilidad rápida del frontend si es necesario:
    lastLoginAt?: string | null;
    createdAt?: string;
}

export interface Client {
    client_id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
    document_type: string;
    document_number: string;
    business_name: string;
    phone: string | null;
    address: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Country {
    country_id: string;
    country_name: string;
    country_description: string | null;
}

export interface DepartementRegion {
    d_region_id: string;
    d_region_name: string;
    d_region_description: string | null;
    country_id: string; // FK
    country?: Country;
}

export interface City {
    city_id: string;
    city_name: string;
    city_description: string | null;
    postal_code: string | null;
    d_region_id: string; // FK
    departement_region?: DepartementRegion;
}

export interface WarehouseType {
    warehouse_type_id: string;
    name: string;
    description: string | null;
}

export interface Warehouse {
    warehouse_id: string;
    code: string;
    name: string;
    address: string;
    total_capacity_m2: number;
    available_capacity_m2: number;
    city_id: string; // FK
    warehouse_type_id: string; // FK

    city?: City;
    warehouse_type?: WarehouseType;
}

export type ContractStatus = "DRAFT" | "PENDING_PAYMENT" | "APPROVED" | "EXPIRED" | "ACTIVE" | "CANCELLED";

export interface Contract {
    contract_id: string;
    client_id: string; // FK
    warehouse_id: string; // FK
    start_date: string;
    end_date: string;
    status: ContractStatus;
    total_amount: number;
    payment_link_expires_at?: string; // Para la regla de las 48h

    // Relaciones
    client?: Client;
    warehouse?: Warehouse;
}

export interface Notification {
    notification_id: string;
    type: string;
    message: string;
    sent_at: string; // Date
    status: string;
    user_id: string; // FK
    contract_id: string | null; // FK
}

// ---------------------------------------------------------------------------
// Entidades Temporales (Pendientes de ser modeladas en BD de Inventario)
// ---------------------------------------------------------------------------

/** Categoría de producto (Temporal, falta ERD de inventario). */
export interface Category {
    id: string;
    name: string;
    description: string | null;
}

/** Producto del inventario (Temporal, falta ERD de inventario). */
export interface Product {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: Category;
    unitPrice: number;
    unit: string;
    stock: number;
    minimumStock: number;
    status: ProductStatus;
    imageUrl: string | null;
    warehouse: Partial<Warehouse>;
    createdAt: string;
    updatedAt: string;
}

/** Movimiento de bodega (Temporal, falta ERD de inventario). */
export interface WarehouseMovement {
    id: string;
    type: MovementType;
    product: Pick<Product, "id" | "sku" | "name" | "unit">;
    quantity: number;
    previousStock: number;
    newStock: number;
    sourceWarehouse: Pick<Warehouse, "warehouse_id" | "name"> | null;
    destinationWarehouse: Pick<Warehouse, "warehouse_id" | "name"> | null;
    referenceNumber: string | null;
    notes: string | null;
    performedBy: Pick<User, "user_id" | "first_name" | "last_name">;
    performedAt: string;
}

// ---------------------------------------------------------------------------
// DTOs de autenticación
// ---------------------------------------------------------------------------

export interface LoginCredentials {
    email: string;
    password: string;
}

// ---------------------------------------------------------------------------
// Respuestas paginadas de la API
// ---------------------------------------------------------------------------

/** Wrapper genérico para respuestas paginadas del backend. */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Parámetros de query comunes para listados paginados. */
export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Utilidades de tipo
// ---------------------------------------------------------------------------

/** Identifica cualquier entidad con ID de string. */
export type WithId = { id: string };

/** Hace todas las propiedades de T opcionales excepto las en Keys. */
export type PartialExcept<T, Keys extends keyof T> = Partial<Omit<T, Keys>> &
    Pick<T, Keys>;
