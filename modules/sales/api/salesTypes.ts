// ─────────────────────────────────────────────────────────────
// ENUMS / UNION TYPES
// ─────────────────────────────────────────────────────────────

export type RentalUnitAvailabilityStatus =
    | "AVAILABLE"
    | "OCCUPIED"
    | "BLOCKED_BY_PARENT"
    | "BLOCKED_BY_CHILD";

export type ReservationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type ContractStatus =
    | "DRAFT"
    | "ACTIVE"
    | "PENDING_PAYMENT"
    | "COMPLETED"
    | "EXPIRED"
    | "CANCELLED";

export type ContractRentalUnitStatus = 1 | 2 | 3; // 1=ACTIVE 2=COMPLETED 3=CANCELLED

export type PaymentStatus = "PENDING" | "APPROVED" | "FAILED" | "REFUNDED";

export type PaymentMethod = "CARD" | "CASH" | "TRANSFER" | "STRIPE";

// ─────────────────────────────────────────────────────────────
// RENTAL UNITS
// ─────────────────────────────────────────────────────────────

export interface RentalUnitEntityType {
    id: number;
    name: string;
    description: string | null;
}

export interface RentalUnitWarehouse {
    id: number;
    name: string;
    code: string;
    /** Enriquecido desde catálogo de infraestructura (/api/warehouses) */
    address?: string | null;
    cityName?: string | null;
    totalCapacityM2?: number | null;
    availableCapacityM2?: number | null;
    typeName?: string | null;
}

export interface RentalUnitSector {
    id: number;
    code: string;
    description: string | null;
}

export interface RentalUnitStorageSpace {
    id: number;
    code: string;
    aisle: string | null;
    level_num: number | null;
}

export interface RentalUnit {
    id: number;
    entityType: RentalUnitEntityType;
    warehouse: RentalUnitWarehouse | null;
    sector: RentalUnitSector | null;
    storageSpace: RentalUnitStorageSpace | null;
    /** Superficie disponible en m², si el backend la envía */
    availableAreaM2: number | null;
    /** Sólo presente cuando el GET se llama con ?startDate y ?endDate */
    availabilityStatus: RentalUnitAvailabilityStatus;
    /** Campo `displayName` del API (además de `displaySummary` unificado). */
    displayName: string | null;
    /** Campo `referenceName` del API (referencia de sector/espacio/bodega). */
    referenceName: string | null;
    /** Nombre legible en listados ligeros (p. ej. displayName del API) */
    displaySummary: string | null;
    /** Dirección u observación de ubicación si el DTO la incluye */
    addressLine: string | null;
    /** Ciudad / localidad asociada a la bodega, si viene en el DTO */
    cityLine: string | null;
}

/** Respuesta de GET /api/sales/rental-units/{id}/catalog-card (oferta bodega completa). */
export type WarehouseCatalogOfferScope = "WAREHOUSE_FULL" | (string & {});

export interface RentalUnitWarehouseCatalogCardDTO {
    rentalUnitId: number;
    offerScope: WarehouseCatalogOfferScope;
    warehouseId: number;
    warehouseCode: string;
    warehouseName: string;
    warehouseLocation: string | null;
    warehouseActive: boolean | null;
    cityId: number | null;
    cityName: string | null;
    warehouseTypeId: number | null;
    warehouseTypeName: string | null;
    warehouseTypeDescription: string | null;
    totalWarehouseCapacityM2: number | null;
    offeredAreaM2: number | null;
    registeredSectorsCount: number | null;
    registeredStorageSpacesCount: number | null;
    warehouseStatusCode: string | null;
    warehouseStatusDescription: string | null;
    warehouseStatusOperational: boolean | null;
    locationSummaryLine: string | null;
    unitTitleLabel: string | null;
}

export interface CreateRentalUnitInput {
    entityType: { id: number };
    warehouse: { id: number } | null;
    sector: { id: number } | null;
    storageSpace: { id: number } | null;
}

/** Fila de GET /api/sales/rental-units/pricing */
export interface RentalUnitPricingRow {
    rentalUnitId: number;
    entityTypeName: string;
    referenceType: string;
    referenceId: number | null;
    referenceCode: string;
    referenceName: string;
    basePrice: number;
    currency: string;
    priceActive: boolean;
    priceUpdatedAt: string | null;
    priceUpdatedBy: string | null;
}

/** Body de PATCH /api/sales/rental-units/{id}/pricing */
export interface UpdateRentalUnitPricingInput {
    basePrice: number;
    currency: string;
    priceActive: boolean;
}

// ─────────────────────────────────────────────────────────────
// DISPONIBILIDAD
// ─────────────────────────────────────────────────────────────

export interface ValidateAvailabilityInput {
    rentalUnitId: number;
    startDate: string;
    endDate: string;
    excludeReservationId?: number | null;
    excludeContractRentalUnitId?: number | null;
}

export interface ValidateBulkAvailabilityInput {
    rentalUnitIds: number[];
    startDate: string;
    endDate: string;
}

export interface OccupancySummary {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    free: number;
}

// ─────────────────────────────────────────────────────────────
// RESERVAS
// ─────────────────────────────────────────────────────────────

export interface ReservationUnit {
    id: number;
    rentalUnitId: number;
    createdAt: string;
    rentalUnit: RentalUnit | null;
}

export interface Reservation {
    id: number;
    clientId: number;
    reservationToken: string;
    status: ReservationStatus;
    startDate: string;
    endDate: string;
    expiresAt: string;
    createdAt: string;
    units: ReservationUnit[];
    client: {
        id: number;
        businessName: string;
        documentType: string;
        documentNumber: string;
    } | null;
}

export interface CreateReservationInput {
    clientId: number;
    startDate: string;
    endDate: string;
    units: { rentalUnitId: number }[];
}

// ─────────────────────────────────────────────────────────────
// CONTRATOS
// ─────────────────────────────────────────────────────────────

export interface ContractRentalUnit {
    contractRentalUnitId: number;
    contractId: number;
    rentalUnitId: number;
    startDate: string;
    endDate: string;
    price: number;
    status: ContractRentalUnitStatus;
    rentalUnit: RentalUnit | null;
}

export interface Contract {
    contractId: number;
    clientId: number;
    reservationToken: string | null;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    createdAt: string;
    /** Total del contrato según backend (pagos deben alinearse a este monto). */
    totalAmount: number | null;
    contractRentalUnits: ContractRentalUnit[];
    client: {
        id: number;
        businessName: string;
        documentType: string;
        documentNumber: string;
        email: string;
    } | null;
}

export interface CreateContractRentalUnitInput {
    rentalUnitId: number;
    startDate: string;
    endDate: string;
    price: number;
    status: ContractRentalUnitStatus;
}

export interface CreateContractInput {
    /** Obligatorio si no existe reservationToken (venta directa) */
    clientId?: number;
    /** Obligatorio si viene de una reserva aprobada */
    reservationToken?: string | null;
    startDate: string;
    endDate: string;
    contractRentalUnits: CreateContractRentalUnitInput[];
}

// ─────────────────────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────────────────────

export interface Payment {
    paymentId: number;
    contractId: number;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentExternalReference: string | null;
    createdAt: string;
    /** Presente solo en la respuesta del POST de creación; usar con Stripe.js y no persistir en estado global. */
    stripeClientSecret?: string | null;
}

export interface CreatePaymentInput {
    contractId: number;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    paymentExternalReference?: string | null;
}
