import { listWarehouses } from "@/modules/infrastructure";
import type { ManagedWarehouse } from "@/modules/infrastructure";
import type { RentalUnit } from "../api/salesTypes";

function resolveManagedWarehouse(
    w: NonNullable<RentalUnit["warehouse"]>,
    byId: Map<string, ManagedWarehouse>,
    all: ManagedWarehouse[]
): ManagedWarehouse | undefined {
    const idKey = w.id !== 0 ? String(w.id) : "";
    if (idKey && byId.has(idKey)) return byId.get(idKey);

    if (w.code?.trim()) {
        if (byId.has(w.code.trim())) return byId.get(w.code.trim());
        const byCode = all.find(x => x.code === w.code.trim());
        if (byCode) return byCode;
    }

    if (w.name?.trim()) {
        const n = w.name.trim().toLowerCase();
        return all.find(x => x.name.trim().toLowerCase() === n);
    }

    return undefined;
}

function mergeWarehouseFields(unit: RentalUnit, managed: ManagedWarehouse): RentalUnit {
    const w = unit.warehouse;
    if (!w) return unit;

    const numericId = Number(managed.id);
    const safeId = Number.isFinite(numericId) && numericId > 0 ? numericId : w.id;

    const nextWarehouse: NonNullable<RentalUnit["warehouse"]> = {
        id: safeId,
        name: managed.name || w.name || managed.code,
        code: managed.code || w.code,
        address: managed.address,
        cityName: managed.cityName,
        totalCapacityM2: managed.totalCapacityM2,
        availableCapacityM2: managed.availableCapacityM2,
        typeName: managed.typeName,
    };

    const nextArea =
        unit.availableAreaM2 != null
            ? unit.availableAreaM2
            : managed.availableCapacityM2 ?? managed.totalCapacityM2 ?? null;

    return {
        ...unit,
        warehouse: nextWarehouse,
        addressLine: unit.addressLine ?? managed.address ?? null,
        cityLine: unit.cityLine ?? managed.cityName ?? null,
        availableAreaM2: nextArea,
    };
}

/**
 * Cruza unidades comerciales con /api/warehouses usando id, código o nombre de bodega.
 */
export async function hydrateRentalUnitsWithWarehouses(units: RentalUnit[]): Promise<RentalUnit[]> {
    if (units.length === 0) return units;

    let warehouses: ManagedWarehouse[];
    try {
        warehouses = await listWarehouses();
    } catch {
        return units;
    }

    const byId = new Map<string, ManagedWarehouse>();
    for (const wh of warehouses) {
        byId.set(wh.id, wh);
        byId.set(String(wh.id), wh);
    }

    return units.map(unit => {
        if (!unit.warehouse) return unit;
        const managed = resolveManagedWarehouse(unit.warehouse, byId, warehouses);
        if (!managed) return unit;
        return mergeWarehouseFields(unit, managed);
    });
}
