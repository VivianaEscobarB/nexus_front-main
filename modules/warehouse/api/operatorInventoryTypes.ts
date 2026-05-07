/** Contratos alineados con el API de inventario (operador de bodega). */

export type ReceptionStatus = string;

export interface CreateReceptionBody {
    warehouseId: number;
    clientRequestId?: string;
    expectedDocumentRef?: string;
}

export interface ReceptionCreatedResponse {
    id: number;
    warehouseId: number;
    status: ReceptionStatus;
}

export interface ActiveReceptionResponse {
    id: number;
    warehouseId: number;
    status: ReceptionStatus;
}

export interface ReceptionExpectedLine {
    receptionLineId: number;
    productName?: string | null;
    productSku?: string | null;
    expectedQuantity: number;
    receivedQuantity: number;
    requiresLot?: boolean;
}

export interface ReceptionDetailResponse {
    id: number;
    warehouseId: number;
    status: ReceptionStatus;
    lines: ReceptionExpectedLine[];
}

export interface CreateReceptionExpectedLineInput {
    barcode: string;
    expectedQuantity: number;
    productName?: string;
    productSku?: string;
    requiresLot?: boolean;
}

export interface ActiveReceptionConflictDetails {
    existingReceptionId?: number;
    warehouseId?: number;
    status?: ReceptionStatus;
}

export interface RfScanBody {
    receptionId: number;
    barcode: string;
}

export interface RfScanResponse {
    receptionLineId: number;
    expectedQuantity: number;
    receivedQuantity?: number;
    remainingQuantity?: number;
    requiresLot: boolean;
    externalProductRef?: string | null;
    productName?: string | null;
    productSku?: string | null;
    suggestedStorageSpaceId?: number | null;
    suggestedStorageSpaceCode?: string | null;
}

export interface RfConfirmBody {
    receptionLineId: number;
    receivedQuantity: number;
    lotCode?: string;
    storageSpaceId?: number;
}

export interface RfConfirmResponse {
    status: string;
    difference: number;
    alertCreated: boolean;
}

export interface RfCompleteReceptionBody {
    storageSpaceId?: number;
}

export type ProductType = string;

export interface CreateProductBody {
    name: string;
    barcode: string;
    productType: ProductType;
    unit: string;
}

export interface InventoryProductResponse {
    id: number;
    name: string;
    barcode: string;
    productType: ProductType;
    unit: string;
    active: boolean;
    createdAt: string;
}

export interface CreateLotBody {
    lotNumber?: string;
    expirationDate?: string;
    productionDate?: string;
}

export interface LotResponse {
    id: number;
    productId: number;
    lotNumber: string;
    expirationDate?: string | null;
    productionDate?: string | null;
    createdAt: string;
}

export interface MovementTypeResponse {
    id: number;
    name: string;
    description?: string | null;
}

export interface MovementSubtypeResponse {
    id: number;
    movementTypeId: number;
    name: string;
    description?: string | null;
}

export interface InventoryBalanceRow {
    id: number;
    productId: number;
    productName: string;
    lotId: number | null;
    lotNumber: string | null;
    storageSpaceId: number;
    storageSpaceCode: string;
    quantity: number;
    updatedAt: string;
}

export interface CreateMovementBody {
    productId: number;
    lotId?: number | null;
    storageSpaceId: number;
    movementTypeId: number;
    movementSubtypeId?: number | null;
    quantity: number;
    note?: string | null;
}

export interface InventoryMovementResponse {
    id: number;
    productId: number;
    lotId: number | null;
    storageSpaceId: number;
    userId: number;
    movementTypeId: number;
    movementTypeName: string;
    movementSubtypeId: number | null;
    movementSubtypeName: string | null;
    quantity: number;
    note: string | null;
    createdAt: string;
}

export interface InventoryHistoryRow {
    id: number;
    movementId: number;
    quantityBefore: number;
    quantityAfter: number;
    createdAt: string;
}

export interface InventoryProcessAlertRow {
    id: number;
    productId: number;
    lotId: number | null;
    storageSpaceId: number;
    alertType: string;
    currentQuantity: number;
    resolved: boolean;
    createdAt: string;
}

export interface CreateCountBody {
    sectorId?: number | null;
}

export interface InventoryCountResponse {
    id: number;
    sectorId: number | null;
    userId: number;
    startedAt: string;
    finishedAt: string | null;
    status: string;
}

export interface CreateCountLineBody {
    productId: number;
    lotId?: number | null;
    storageSpaceId: number;
    systemQty: number;
    physicalQty: number;
    difference: number;
}

export interface InventoryCountDetailResponse {
    id: number;
    countId: number;
    productId: number;
    lotId: number | null;
    storageSpaceId: number;
    systemQty: number;
    physicalQty: number;
    difference: number;
}
