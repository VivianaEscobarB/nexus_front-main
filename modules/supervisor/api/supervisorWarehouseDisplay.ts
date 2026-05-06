import type { JsonRecord } from "@/modules/supervisor/api/supervisorWarehouseTypes";

export function pickFirstString(record: JsonRecord, keys: string[]): string | null {
    for (const key of keys) {
        const v = record[key];
        if (typeof v === "string" && v.trim()) {
            return v.trim();
        }
        if (typeof v === "number" && Number.isFinite(v)) {
            return String(v);
        }
    }
    return null;
}

export function stableRowId(record: JsonRecord, index: number): string {
    const id = record.id ?? record.inventoryId ?? record.lineId ?? record.uuid;
    if (typeof id === "string" || typeof id === "number") {
        return String(id);
    }
    return `row-${index}`;
}
