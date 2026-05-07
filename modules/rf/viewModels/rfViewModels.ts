/**
 * Tipos de presentación del dominio RF. La UI debe depender solo de estos
 * contratos; los DTO del API se adaptan en `mappers/rfApiMapper`.
 */

export interface RFScanViewModel {
    receptionLineId: number;
    productName: string;
    externalProductRef: string | null;
    productSku: string | null;
    expectedQuantity: number;
    receivedQuantity: number;
    remainingQuantity: number;
    requiresLot: boolean;
    suggestedStorageSpaceId: number | null;
    suggestedStorageSpaceCode: string | null;
}

export interface RFConfirmViewModel {
    statusLabel: string;
    quantityDifference: number;
    alertRaised: boolean;
}
