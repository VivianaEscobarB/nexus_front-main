/** Respuestas del API de bodega: tolerantes a distintos DTOs / envoltorios Spring. */

export type JsonRecord = Record<string, unknown>;

export type InventoryOverviewPayload = JsonRecord;

export type KardexQuery = {
    productId: string;
    dateFrom: string;
    dateTo: string;
};

export type InventoryListQuery = {
    productId?: string;
    storageSpaceId?: string;
};
