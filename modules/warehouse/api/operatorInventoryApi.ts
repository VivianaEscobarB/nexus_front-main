import type {
    CreateCountBody,
    CreateCountLineBody,
    CreateLotBody,
    CreateMovementBody,
    CreateProductBody,
    CreateReceptionBody,
    InventoryBalanceRow,
    InventoryCountDetailResponse,
    InventoryCountResponse,
    InventoryHistoryRow,
    InventoryMovementResponse,
    InventoryProcessAlertRow,
    InventoryProductResponse,
    LotResponse,
    MovementSubtypeResponse,
    MovementTypeResponse,
    ReceptionCreatedResponse,
    RfCompleteReceptionBody,
    RfConfirmBody,
    RfConfirmResponse,
    RfScanBody,
    RfScanResponse,
} from "@/modules/warehouse/api/operatorInventoryTypes";
import { httpClient } from "@/shared/api/httpClient";

const BASE = "/api/inventory";

/** Algunos endpoints devuelven `{ success, message, data }`; otros el cuerpo directo. */
function unwrap<T>(raw: unknown): T {
    if (raw && typeof raw === "object" && "data" in raw) {
        const d = (raw as { data: unknown }).data;
        return d as T;
    }
    return raw as T;
}

function asList<T>(raw: unknown): T[] {
    const v = unwrap<unknown>(raw);
    if (Array.isArray(v)) {
        return v as T[];
    }
    if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        for (const key of ["content", "items", "data", "results"]) {
            const inner = o[key];
            if (Array.isArray(inner)) {
                return inner as T[];
            }
        }
    }
    return [];
}

// --- Recepciones / RF ---

export async function createInventoryReception(
    body: CreateReceptionBody
): Promise<ReceptionCreatedResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/receptions`, body);
    return unwrap<ReceptionCreatedResponse>(raw);
}

export async function rfScan(body: RfScanBody): Promise<RfScanResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/rf/scan`, body);
    return unwrap<RfScanResponse>(raw);
}

export async function rfConfirm(body: RfConfirmBody): Promise<RfConfirmResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/rf/confirm`, body);
    return unwrap<RfConfirmResponse>(raw);
}

export async function completeRfReception(
    receptionId: number,
    body: RfCompleteReceptionBody
): Promise<void> {
    await httpClient.patch<void>(`${BASE}/rf/reception/${receptionId}/complete`, body);
}

// --- Productos y lotes ---

export async function createInventoryProduct(
    body: CreateProductBody
): Promise<InventoryProductResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/products`, body);
    return unwrap<InventoryProductResponse>(raw);
}

export async function listInventoryProducts(): Promise<InventoryProductResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/products`);
    return asList<InventoryProductResponse>(raw);
}

export async function createProductLot(
    productId: number,
    body: CreateLotBody
): Promise<LotResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/products/${productId}/lots`, body);
    return unwrap<LotResponse>(raw);
}

export async function listProductLots(productId: number): Promise<LotResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/products/${productId}/lots`);
    return asList<LotResponse>(raw);
}

// --- Tipos de movimiento ---

export async function listMovementTypes(): Promise<MovementTypeResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/movement-types`);
    return asList<MovementTypeResponse>(raw);
}

export async function listMovementSubtypes(
    typeId: number
): Promise<MovementSubtypeResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/movement-types/${typeId}/subtypes`);
    return asList<MovementSubtypeResponse>(raw);
}

// --- Saldos y movimientos ---

export async function listInventoryBalances(params: {
    productId?: number;
    storageSpaceId?: number;
}): Promise<InventoryBalanceRow[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/balances`, {
        query: {
            productId: params.productId,
            storageSpaceId: params.storageSpaceId,
        },
    });
    return asList<InventoryBalanceRow>(raw);
}

export async function createInventoryMovement(
    body: CreateMovementBody
): Promise<InventoryMovementResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/movements`, body);
    return unwrap<InventoryMovementResponse>(raw);
}

export async function listRecentMovements(): Promise<InventoryMovementResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/movements/recent`);
    return asList<InventoryMovementResponse>(raw);
}

export async function listRecentInventoryHistory(): Promise<InventoryHistoryRow[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/history/recent`);
    return asList<InventoryHistoryRow>(raw);
}

// --- Alertas (proceso inventario) ---

export async function listInventoryProcessAlerts(openOnly = true): Promise<InventoryProcessAlertRow[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/alerts`, {
        query: { openOnly },
    });
    return asList<InventoryProcessAlertRow>(raw);
}

export async function resolveInventoryAlert(alertId: number): Promise<void> {
    await httpClient.patch<void>(`${BASE}/alerts/${alertId}/resolve`, {});
}

// --- Conteos ---

export async function createInventoryCount(body?: CreateCountBody): Promise<InventoryCountResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/counts`, body ?? {});
    return unwrap<InventoryCountResponse>(raw);
}

export async function listInventoryCounts(): Promise<InventoryCountResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/counts`);
    return asList<InventoryCountResponse>(raw);
}

export async function addInventoryCountLine(
    countId: number,
    body: CreateCountLineBody
): Promise<InventoryCountDetailResponse> {
    const raw = await httpClient.post<unknown>(`${BASE}/counts/${countId}/lines`, body);
    return unwrap<InventoryCountDetailResponse>(raw);
}

export async function listInventoryCountLines(
    countId: number
): Promise<InventoryCountDetailResponse[]> {
    const raw = await httpClient.get<unknown>(`${BASE}/counts/${countId}/lines`);
    return asList<InventoryCountDetailResponse>(raw);
}

export async function completeInventoryCount(
    countId: number
): Promise<InventoryCountResponse> {
    const raw = await httpClient.patch<unknown>(`${BASE}/counts/${countId}/complete`, {});
    return unwrap<InventoryCountResponse>(raw);
}
