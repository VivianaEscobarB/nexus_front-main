import type {
    InventoryListQuery,
    InventoryOverviewPayload,
    JsonRecord,
    KardexQuery,
} from "@/modules/supervisor/api/supervisorWarehouseTypes";
import { httpClient } from "@/shared/api/httpClient";

const ALERTS_PATH = "/api/alerts";
const INVENTORY_BASE = "/api/inventory";
const KARDEX_PATH = "/api/kardex";

export function normalizeApiList<T = JsonRecord>(data: unknown): T[] {
    if (Array.isArray(data)) {
        return data as T[];
    }
    if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        for (const key of ["content", "items", "data", "alerts", "results", "records"]) {
            const v = o[key];
            if (Array.isArray(v)) {
                return v as T[];
            }
        }
    }
    return [];
}

export async function listAlerts(): Promise<JsonRecord[]> {
    const raw = await httpClient.get<unknown>(ALERTS_PATH, { auth: true });
    return normalizeApiList<JsonRecord>(raw);
}

export async function listInventory(
    query: InventoryListQuery
): Promise<JsonRecord[]> {
    const raw = await httpClient.get<unknown>(INVENTORY_BASE, {
        auth: true,
        query: {
            productId: query.productId?.trim() || undefined,
            storageSpaceId: query.storageSpaceId?.trim() || undefined,
        },
    });
    return normalizeApiList<JsonRecord>(raw);
}

export async function getInventoryByProductId(productId: string): Promise<JsonRecord> {
    const id = productId.trim();
    return httpClient.get<JsonRecord>(`${INVENTORY_BASE}/${encodeURIComponent(id)}`, {
        auth: true,
    });
}

export async function getInventoryOverview(): Promise<InventoryOverviewPayload> {
    return httpClient.get<InventoryOverviewPayload>(`${INVENTORY_BASE}/overview`, {
        auth: true,
    });
}

export async function getKardex(query: KardexQuery): Promise<JsonRecord[]> {
    const raw = await httpClient.get<unknown>(KARDEX_PATH, {
        auth: true,
        query: {
            productId: query.productId.trim(),
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
        },
    });
    return normalizeApiList<JsonRecord>(raw);
}
