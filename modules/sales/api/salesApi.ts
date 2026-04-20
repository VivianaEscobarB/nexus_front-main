import { httpClient } from "@/shared/api/httpClient";
import type {
    Contract,
    ContractRentalUnit,
    ContractRentalUnitStatus,
    ContractStatus,
    CreateContractInput,
    CreatePaymentInput,
    CreateRentalUnitInput,
    CreateReservationInput,
    OccupancySummary,
    Payment,
    PaymentMethod,
    PaymentStatus,
    RentalUnit,
    RentalUnitAvailabilityStatus,
    RentalUnitPricingRow,
    RentalUnitWarehouseCatalogCardDTO,
    Reservation,
    ReservationStatus,
    UpdateRentalUnitPricingInput,
    ValidateAvailabilityInput,
    ValidateBulkAvailabilityInput,
    WarehouseCatalogOfferScope,
} from "./salesTypes";
import { hydrateRentalUnitsWithWarehouses } from "../services/hydrateRentalUnitsFromInfrastructure";
import { isApiError } from "@/shared/api/apiError";

// ─────────────────────────────────────────────────────────────
// HELPERS (mismo patrón que clientsApi.ts)
// ─────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;
}

function getNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function extractCollection(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];

    const p = payload as Record<string, unknown>;
    const candidates = [
        p.data,
        p.items,
        p.content,
        p.results,
        p.units,
        p.rentalUnits,
        p.rental_units,
        p.list,
        p.records,
        p.body,
        p.elements,
        p.rows,
        p.reservations,
        p.contracts,
        p.payments,
        p.pricing,
        p.pricingRows,
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c;
    }

    // Spring Page u objeto anidado: { data: { content: [...] } }
    const dataVal = p.data;
    if (isObject(dataVal) && !Array.isArray(dataVal)) {
        const d = dataVal as Record<string, unknown>;
        const nested = [d.content, d.items, d.data, d.records, d.list];
        for (const c of nested) {
            if (Array.isArray(c)) return c;
        }
    }

    return [];
}

const VALID_AVAILABILITY_STATUSES = new Set<RentalUnitAvailabilityStatus>([
    "AVAILABLE",
    "OCCUPIED",
    "BLOCKED_BY_PARENT",
    "BLOCKED_BY_CHILD",
]);

function normalizeAvailabilityStatus(value: unknown): RentalUnitAvailabilityStatus {
    if (typeof value === "string") {
        const upper = value.trim().toUpperCase() as RentalUnitAvailabilityStatus;
        if (VALID_AVAILABILITY_STATUSES.has(upper)) return upper;
    }
    return "AVAILABLE";
}

const VALID_RESERVATION_STATUSES = new Set<ReservationStatus>([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
]);

function normalizeReservationStatus(value: unknown): ReservationStatus {
    if (typeof value === "string") {
        const upper = value.trim().toUpperCase() as ReservationStatus;
        if (VALID_RESERVATION_STATUSES.has(upper)) return upper;
    }
    return "PENDING";
}

const VALID_CONTRACT_STATUSES = new Set<ContractStatus>([
    "DRAFT",
    "ACTIVE",
    "PENDING_PAYMENT",
    "COMPLETED",
    "EXPIRED",
    "CANCELLED",
]);

/**
 * Estados de contrato según API (códigos numéricos habituales).
 * `PENDING_PAYMENT` del API se trata como fase previa a ACTIVE → se unifica a DRAFT en el front.
 */
const CONTRACT_STATUS_NUMERIC: Record<number, ContractStatus> = {
    1: "DRAFT",
    2: "ACTIVE",
    3: "COMPLETED",
    4: "CANCELLED",
    5: "EXPIRED",
};

function statusFromNumericContractStatus(code: number): ContractStatus | null {
    return CONTRACT_STATUS_NUMERIC[code] ?? null;
}

function normalizeContractStatus(value: unknown, statusNameHint?: unknown): ContractStatus {
    const nameFromHint =
        typeof statusNameHint === "string"
            ? statusNameHint.trim().toUpperCase()
            : "";

    if (nameFromHint && VALID_CONTRACT_STATUSES.has(nameFromHint as ContractStatus)) {
        if (nameFromHint === "PENDING_PAYMENT") return "DRAFT";
        return nameFromHint as ContractStatus;
    }

    if (isObject(value) && !Array.isArray(value)) {
        const o = value as Record<string, unknown>;
        const nestedName = getString(o.name ?? o.statusName ?? o.status_name)?.trim().toUpperCase() ?? "";
        if (nestedName && VALID_CONTRACT_STATUSES.has(nestedName as ContractStatus)) {
            if (nestedName === "PENDING_PAYMENT") return "DRAFT";
            return nestedName as ContractStatus;
        }
        const id = getNumber(o.id ?? o.code ?? o.value);
        if (id != null) {
            const mapped = statusFromNumericContractStatus(id);
            if (mapped) return mapped;
        }
    }

    if (typeof value === "number" && Number.isInteger(value)) {
        const mapped = statusFromNumericContractStatus(value);
        if (mapped) return mapped;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        const upper = trimmed.toUpperCase() as ContractStatus;
        if (VALID_CONTRACT_STATUSES.has(upper)) {
            if (upper === "PENDING_PAYMENT") return "DRAFT";
            return upper;
        }
        const asInt = Number.parseInt(trimmed, 10);
        if (!Number.isNaN(asInt)) {
            const mapped = statusFromNumericContractStatus(asInt);
            if (mapped) return mapped;
        }
    }

    return "DRAFT";
}

const VALID_PAYMENT_STATUSES = new Set<PaymentStatus>([
    "PENDING",
    "APPROVED",
    "FAILED",
    "REFUNDED",
]);

function normalizePaymentStatus(value: unknown): PaymentStatus {
    if (typeof value === "string") {
        const upper = value.trim().toUpperCase() as PaymentStatus;
        if (VALID_PAYMENT_STATUSES.has(upper)) return upper;
    }
    return "PENDING";
}

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
    "CARD",
    "CASH",
    "TRANSFER",
    "STRIPE",
]);

function normalizePaymentMethod(value: unknown): PaymentMethod {
    if (typeof value === "string") {
        const upper = value.trim().toUpperCase() as PaymentMethod;
        if (VALID_PAYMENT_METHODS.has(upper)) return upper;
    }
    return "CARD";
}

// ─────────────────────────────────────────────────────────────
// MAPPERS
// ─────────────────────────────────────────────────────────────

/** Primer valor bajo una de las claves que sea objeto (no array). */
function firstChildObject(
    payload: Record<string, unknown>,
    keys: string[]
): Record<string, unknown> | null {
    for (const key of keys) {
        const v = payload[key];
        if (isObject(v) && !Array.isArray(v)) return v as Record<string, unknown>;
    }
    return null;
}

function mapEntityTypeFromPayload(p: Record<string, unknown>): RentalUnit["entityType"] {
    const et = p.entityType ?? p.entity_type ?? p.entityTypeDto ?? p.type;
    let id = 0;
    let name = "";
    let description: string | null = null;

    if (typeof et === "string" && et.trim()) {
        name = et.trim();
    } else if (isObject(et) && !Array.isArray(et)) {
        const o = et as Record<string, unknown>;
        id = getNumber(o.id ?? o.entityTypeId ?? o.entity_type_id) ?? 0;
        name =
            getString(o.name ?? o.label ?? o.code ?? o.typeName ?? o.type_name) ?? "";
        description = getString(o.description ?? o.descripcion);
    }

    if (!name) {
        name =
            getString(p.entityTypeName) ??
            getString(p.entity_type_name) ??
            getString(p.typeName) ??
            getString(p.type_name) ??
            getString(p.rentalEntityType) ??
            "";
    }

    if (!name && id) name = `Tipo #${id}`;

    return { id, name, description };
}

function warehouseIdFromRaw(raw: Record<string, unknown>): number {
    const rawId = raw.id ?? raw.warehouseId ?? raw.warehouse_id;
    const n = getNumber(rawId);
    if (n != null) return n;
    if (typeof rawId === "string" && /^\d+$/.test(rawId.trim())) return Number(rawId.trim());
    return 0;
}

function mapWarehouseFromSources(
    p: Record<string, unknown>,
    raw: Record<string, unknown> | null
): RentalUnit["warehouse"] {
    const refType = (getString(p.referenceType ?? p.reference_type) ?? "").toUpperCase();
    const refPointsToWarehouse =
        (refType.includes("WAREHOUSE") || refType.includes("BODEGA")) &&
        !refType.includes("SECTOR") &&
        !refType.includes("SPACE") &&
        !refType.includes("STORAGE") &&
        !refType.includes("ESPACIO");
    const refIdForWarehouse = refPointsToWarehouse
        ? getNumber(p.referenceId ?? p.reference_id)
        : null;

    if (raw) {
        const id = warehouseIdFromRaw(raw);
        const name = getString(raw.name ?? raw.nombre ?? raw.displayName ?? raw.display_name) ?? "";
        const code =
            getString(raw.code ?? raw.codigo ?? raw.internalCode) ??
            (typeof (raw.id ?? raw.warehouseId) === "string" && !/^\d+$/.test(String(raw.id ?? raw.warehouseId).trim())
                ? String(raw.id ?? raw.warehouseId).trim()
                : "") ??
            "";
        if (name || code || id) {
            return {
                id,
                name: name || code || (id ? `Bodega #${id}` : ""),
                code: code || name || (id ? String(id) : ""),
            };
        }
    }
    const flatName =
        getString(
            p.warehouseName ??
                p.warehouse_name ??
                p.bodegaNombre ??
                p.bodega_nombre ??
                p.nombreBodega
        ) ?? "";
    const flatCode = getString(p.warehouseCode ?? p.warehouse_code ?? p.bodegaCodigo) ?? "";
    const whScalar = p.warehouseId ?? p.warehouse_id ?? p.bodegaId;
    const flatId = getNumber(whScalar) ?? refIdForWarehouse ?? 0;
    const stringIdForLookup =
        typeof whScalar === "string" && whScalar.trim() && !/^\d+$/.test(whScalar.trim())
            ? whScalar.trim()
            : "";

    if (flatName || flatCode || flatId || stringIdForLookup) {
        return {
            id: flatId,
            name: flatName || flatCode || "",
            code: flatCode || flatName || stringIdForLookup || (flatId ? String(flatId) : ""),
        };
    }
    return null;
}

function mapSectorFromSources(
    p: Record<string, unknown>,
    raw: Record<string, unknown> | null
): RentalUnit["sector"] {
    if (raw) {
        const id = getNumber(raw.id ?? raw.sectorId ?? raw.sector_id) ?? 0;
        const code = getString(raw.code ?? raw.codigo ?? raw.name) ?? "";
        const description = getString(raw.description ?? raw.descripcion);
        if (code || id) {
            return {
                id,
                code: code || (id ? `S-${id}` : ""),
                description,
            };
        }
    }
    const flatCode = getString(p.sectorCode ?? p.sector_code ?? p.codigoSector) ?? "";
    const flatId = getNumber(p.sectorId ?? p.sector_id) ?? 0;
    if (flatCode || flatId) {
        return {
            id: flatId,
            code: flatCode || (flatId ? `S-${flatId}` : ""),
            description: null,
        };
    }
    return null;
}

function mapStorageSpaceFromSources(
    p: Record<string, unknown>,
    raw: Record<string, unknown> | null
): RentalUnit["storageSpace"] {
    if (raw) {
        const id = getNumber(raw.id ?? raw.storageSpaceId ?? raw.storage_space_id) ?? 0;
        const code =
            getString(raw.code ?? raw.codigo ?? raw.referenceCode ?? raw.reference_code ?? raw.name) ?? "";
        const aisle = getString(raw.aisle ?? raw.pasillo ?? raw.corridor);
        const level_num =
            getNumber(raw.level_num ?? raw.levelNum ?? raw.level ?? raw.nivel) ?? null;
        if (code || id) {
            return { id, code: code || (id ? `E-${id}` : ""), aisle, level_num };
        }
    }
    const flatCode =
        getString(
            p.storageSpaceCode ??
                p.storage_space_code ??
                p.espacioCodigo ??
                p.espacio_codigo ??
                p.spaceCode
        ) ?? "";
    const flatId = getNumber(p.storageSpaceId ?? p.storage_space_id) ?? 0;
    if (flatCode || flatId) {
        return { id: flatId, code: flatCode || (flatId ? `E-${flatId}` : ""), aisle: null, level_num: null };
    }
    return null;
}

function pickAvailableAreaM2(
    p: Record<string, unknown>,
    warehouseRaw: Record<string, unknown> | null,
    sectorRaw: Record<string, unknown> | null,
    spaceRaw: Record<string, unknown> | null
): number | null {
    const top = getNumber(
        p.availableAreaM2 ??
            p.available_area_m2 ??
            p.areaM2 ??
            p.area_m2 ??
            p.area ??
            p.capacityM2 ??
            p.capacity_m2 ??
            p.superficieM2 ??
            p.superficie_m2
    );
    if (top != null) return top;

    if (spaceRaw) {
        const a = getNumber(
            spaceRaw.availableAreaM2 ??
                spaceRaw.available_area_m2 ??
                spaceRaw.capacityM2 ??
                spaceRaw.capacity_m2 ??
                spaceRaw.area ??
                spaceRaw.superficieM2 ??
                spaceRaw.superficie_m2
        );
        if (a != null) return a;
    }
    if (sectorRaw) {
        const a = getNumber(sectorRaw.capacityM2 ?? sectorRaw.capacity_m2 ?? sectorRaw.area);
        if (a != null) return a;
    }
    if (warehouseRaw) {
        const a = getNumber(
            warehouseRaw.availableCapacityM2 ??
                warehouseRaw.available_capacity_m2 ??
                warehouseRaw.totalCapacityM2 ??
                warehouseRaw.total_capacity_m2
        );
        if (a != null) return a;
    }
    return null;
}

/**
 * Completa unidades cuando el listado viene como DTO plano (displayName, referenceType, …)
 * o cuando faltan nombres pero hay texto resumido.
 */
function enrichRentalUnitFromListDto(
    p: Record<string, unknown>,
    unit: RentalUnit,
    warehouseRaw: Record<string, unknown> | null
): RentalUnit {
    const displayNameRaw = getString(p.displayName ?? p.display_name) ?? null;
    const displaySummary =
        displayNameRaw ??
        getString(p.title ?? p.caption ?? p.label) ??
        null;

    let addressLine =
        getString(
            p.address ??
                p.warehouseAddress ??
                p.warehouse_address ??
                p.direccion ??
                p.locationAddress ??
                p.location_address
        ) ?? null;
    let cityLine =
        getString(
            p.cityName ??
                p.city_name ??
                p.ciudad ??
                p.warehouseCity ??
                p.warehouse_city ??
                p.city
        ) ?? null;

    if (warehouseRaw) {
        if (!addressLine) {
            addressLine =
                getString(
                    warehouseRaw.address ??
                        warehouseRaw.direccion ??
                        warehouseRaw.location ??
                        warehouseRaw.fullAddress
                ) ?? addressLine;
        }
        if (!cityLine) {
            cityLine =
                getString(
                    warehouseRaw.cityName ??
                        warehouseRaw.city_name ??
                        warehouseRaw.city ??
                        warehouseRaw.ciudad
                ) ?? cityLine;
        }
    }

    const refType = (getString(p.referenceType ?? p.reference_type) ?? "").toUpperCase();
    const refIdNum = getNumber(p.referenceId ?? p.reference_id);
    const refCode = getString(p.referenceCode ?? p.reference_code) ?? "";
    const refName = getString(p.referenceName ?? p.reference_name) ?? "";
    const referenceNameField = refName.trim() ? refName : null;
    const placeLabel =
        refName ||
        refCode ||
        (displaySummary ? displaySummary.split(/[—\-|]/)[0].trim() : "") ||
        "";

    let { entityType, warehouse, sector, storageSpace } = unit;

    const hasLocation =
        Boolean(warehouse?.name?.trim() || warehouse?.code?.trim()) ||
        Boolean(sector?.code?.trim()) ||
        Boolean(storageSpace?.code?.trim());

    if (!hasLocation && placeLabel) {
        if (refType.includes("SECTOR")) {
            sector = {
                id: refIdNum ?? 0,
                code: placeLabel,
                description: refName || null,
            };
        } else if (
            refType.includes("SPACE") ||
            refType.includes("STORAGE") ||
            refType.includes("ESPACIO") ||
            refType.includes("PUESTO")
        ) {
            storageSpace = {
                id: refIdNum ?? 0,
                code: placeLabel,
                aisle: null,
                level_num: null,
            };
        } else {
            warehouse = {
                id: refIdNum ?? 0,
                name: refName || placeLabel || displaySummary || `Bodega · unidad ${unit.id}`,
                code: refCode || refName || "",
            };
        }
    }

    if (!hasLocation && !placeLabel && displaySummary?.trim()) {
        warehouse = {
            id: refIdNum ?? 0,
            name: displaySummary.trim(),
            code: refCode || "",
        };
    }

    if (!entityType.name?.trim()) {
        const etn =
            getString(p.entityTypeName ?? p.entity_type_name) ??
            (refType ? refType.replace(/_/g, " ").toLowerCase() : null);
        if (etn) {
            entityType = {
                ...entityType,
                name: etn.charAt(0).toUpperCase() + etn.slice(1),
            };
        }
    }

    if (!entityType.name?.trim()) {
        if (storageSpace?.code) {
            entityType = { ...entityType, name: "Espacio de almacenamiento" };
        } else if (sector?.code) {
            entityType = { ...entityType, name: "Sector" };
        } else if (warehouse?.name) {
            entityType = { ...entityType, name: "Bodega" };
        }
    }

    return {
        ...unit,
        entityType,
        warehouse,
        sector,
        storageSpace,
        displayName: displayNameRaw,
        referenceName: referenceNameField,
        displaySummary,
        addressLine,
        cityLine,
    };
}

function mapRentalUnit(payload: unknown): RentalUnit {
    if (!isObject(payload)) throw new Error("La API devolvió una RentalUnit inválida.");

    const p = payload as Record<string, unknown>;

    const id = getNumber(p.id ?? p.rentalUnitId ?? p.rental_unit_id);
    if (!id) throw new Error("La API devolvió una RentalUnit sin ID.");

    const inmueble = firstChildObject(p, ["inmueble", "property", "location", "ubicacion"]);

    const warehouseRaw =
        firstChildObject(p, [
            "warehouse",
            "bodega",
            "Warehouse",
            "managedWarehouse",
            "warehouseDto",
        ]) ??
        (inmueble ? firstChildObject(inmueble, ["warehouse", "bodega"]) : null);

    const sectorRaw =
        firstChildObject(p, ["sector", "Sector"]) ??
        (inmueble ? firstChildObject(inmueble, ["sector"]) : null);

    const spaceRaw =
        firstChildObject(p, [
            "storageSpace",
            "storage_space",
            "espacio",
            "space",
            "storageUnit",
            "storage_unit",
            "puesto",
        ]) ??
        (inmueble
            ? firstChildObject(inmueble, [
                "storageSpace",
                "storage_space",
                "espacio",
                "space",
                "puesto",
            ])
            : null);

    const core: RentalUnit = {
        id,
        entityType: mapEntityTypeFromPayload(p),
        warehouse: mapWarehouseFromSources(p, warehouseRaw),
        sector: mapSectorFromSources(p, sectorRaw),
        storageSpace: mapStorageSpaceFromSources(p, spaceRaw),
        availableAreaM2: pickAvailableAreaM2(p, warehouseRaw, sectorRaw, spaceRaw),
        availabilityStatus: normalizeAvailabilityStatus(
            p.availabilityStatus ?? p.availability_status
        ),
        displayName: null,
        referenceName: null,
        displaySummary: null,
        addressLine: null,
        cityLine: null,
    };

    return enrichRentalUnitFromListDto(p, core, warehouseRaw);
}

function mapReservation(payload: unknown): Reservation {
    if (!isObject(payload)) throw new Error("La API devolvió una Reserva inválida.");

    const id = getNumber(payload.id ?? payload.reservationId ?? payload.reservation_id);
    if (!id) throw new Error("La API devolvió una Reserva sin ID.");

    const rawUnits = Array.isArray(payload.units)
        ? payload.units
        : Array.isArray(payload.rentalUnits)
          ? payload.rentalUnits
          : Array.isArray(payload.reservationRentalUnits)
            ? payload.reservationRentalUnits
            : [];

    const clientRaw = isObject(payload.client) ? payload.client : null;
    const fallbackClientName =
        getString(
            payload.clientName ??
            payload.client_name ??
            payload.businessName ??
            payload.business_name
        ) ?? "";
    const fallbackDocumentType =
        getString(payload.clientDocumentType ?? payload.client_document_type ?? payload.documentType ?? payload.document_type) ?? "";
    const fallbackDocumentNumber =
        getString(payload.clientDocumentNumber ?? payload.client_document_number ?? payload.documentNumber ?? payload.document_number) ?? "";

    return {
        id,
        clientId:         getNumber(payload.clientId ?? payload.client_id) ?? 0,
        reservationToken: getString(payload.reservationToken ?? payload.reservation_token) ?? "",
        status:           normalizeReservationStatus(payload.status),
        startDate:        getString(payload.startDate ?? payload.start_date) ?? "",
        endDate:          getString(payload.endDate   ?? payload.end_date)   ?? "",
        expiresAt:        getString(payload.expiresAt ?? payload.expires_at) ?? "",
        createdAt:        getString(payload.createdAt ?? payload.created_at) ?? "",
        units: rawUnits.map((u: unknown) => {
            if (!isObject(u)) return { id: 0, rentalUnitId: 0, createdAt: "", rentalUnit: null };
            const nestedRentalUnit = isObject(u.rentalUnit) ? (u.rentalUnit as Record<string, unknown>) : null;
            return {
                id:           getNumber(u.id) ?? 0,
                rentalUnitId: getNumber(
                    u.rentalUnitId ??
                    u.rental_unit_id ??
                    u.unitId ??
                    u.unit_id ??
                    nestedRentalUnit?.id ??
                    nestedRentalUnit?.rentalUnitId ??
                    nestedRentalUnit?.rental_unit_id
                ) ?? 0,
                createdAt:    getString(u.createdAt ?? u.created_at) ?? "",
                rentalUnit:   nestedRentalUnit ? mapRentalUnit(nestedRentalUnit) : null,
            };
        }),
        client: clientRaw
            ? {
                id:             getNumber(clientRaw.id) ?? 0,
                businessName:   getString(clientRaw.businessName ?? clientRaw.business_name) ?? "",
                documentType:   getString(clientRaw.documentType ?? clientRaw.document_type) ?? "",
                documentNumber: getString(clientRaw.documentNumber ?? clientRaw.document_number) ?? "",
            }
            : fallbackClientName || fallbackDocumentType || fallbackDocumentNumber
              ? {
                    id: getNumber(payload.clientId ?? payload.client_id) ?? 0,
                    businessName: fallbackClientName,
                    documentType: fallbackDocumentType,
                    documentNumber: fallbackDocumentNumber,
                }
              : null,
    };
}

function mapContractRentalUnit(contractId: number, payload: unknown): ContractRentalUnit {
    if (!isObject(payload)) throw new Error("La API devolvió una ContractRentalUnit inválida.");

    const rawStatus = getNumber(payload.status);
    const safeStatus: ContractRentalUnitStatus =
        rawStatus === 1 || rawStatus === 2 || rawStatus === 3 ? rawStatus : 1;
    const nestedRentalUnit = isObject(payload.rentalUnit) ? (payload.rentalUnit as Record<string, unknown>) : null;

    return {
        contractRentalUnitId: getNumber(payload.contractRentalUnitId ?? payload.id) ?? 0,
        contractId,
        rentalUnitId: getNumber(
            payload.rentalUnitId ??
            payload.rental_unit_id ??
            payload.unitId ??
            payload.unit_id ??
            nestedRentalUnit?.id ??
            nestedRentalUnit?.rentalUnitId ??
            nestedRentalUnit?.rental_unit_id
        ) ?? 0,
        startDate:    getString(payload.startDate ?? payload.start_date) ?? "",
        endDate:      getString(payload.endDate   ?? payload.end_date)   ?? "",
        price:        getNumber(payload.price) ?? 0,
        status:       safeStatus,
        rentalUnit:   nestedRentalUnit ? mapRentalUnit(nestedRentalUnit) : null,
    };
}

function mapContract(payload: unknown): Contract {
    if (!isObject(payload)) throw new Error("La API devolvió un Contrato inválido.");

    const id = getNumber(payload.contractId ?? payload.id ?? payload.contract_id);
    if (!id) throw new Error("La API devolvió un Contrato sin ID.");

    const rawUnits = Array.isArray(payload.contractRentalUnits)
        ? payload.contractRentalUnits
        : Array.isArray(payload.contract_rental_units)
          ? payload.contract_rental_units
          : Array.isArray(payload.units)
            ? payload.units
            : [];
    const clientRaw = isObject(payload.client) ? payload.client : null;
    const fallbackClientName =
        getString(
            payload.clientName ??
            payload.client_name ??
            payload.businessName ??
            payload.business_name
        ) ?? "";
    const fallbackDocumentType =
        getString(payload.clientDocumentType ?? payload.client_document_type ?? payload.documentType ?? payload.document_type) ?? "";
    const fallbackDocumentNumber =
        getString(payload.clientDocumentNumber ?? payload.client_document_number ?? payload.documentNumber ?? payload.document_number) ?? "";
    const fallbackClientEmail = getString(payload.clientEmail ?? payload.client_email ?? payload.email) ?? "";

    const totalAmountRaw = getNumber(payload.totalAmount ?? payload.total_amount);

    return {
        contractId:          id,
        clientId:            getNumber(payload.clientId ?? payload.client_id) ?? 0,
        reservationToken:    getString(payload.reservationToken ?? payload.reservation_token),
        startDate:           getString(payload.startDate ?? payload.start_date) ?? "",
        endDate:             getString(payload.endDate   ?? payload.end_date)   ?? "",
        status:              normalizeContractStatus(
            payload.status ?? payload.contractStatus ?? payload.contract_status,
            payload.statusName ??
                payload.status_name ??
                payload.contractStatusName ??
                payload.contract_status_name
        ),
        createdAt:           getString(payload.createdAt ?? payload.created_at) ?? "",
        totalAmount:         totalAmountRaw != null && totalAmountRaw >= 0 ? totalAmountRaw : null,
        contractRentalUnits: rawUnits.map((u) => mapContractRentalUnit(id, u)),
        client: clientRaw
            ? {
                id:             getNumber(clientRaw.id) ?? 0,
                businessName:   getString(clientRaw.businessName ?? clientRaw.business_name) ?? "",
                documentType:   getString(clientRaw.documentType ?? clientRaw.document_type) ?? "",
                documentNumber: getString(clientRaw.documentNumber ?? clientRaw.document_number) ?? "",
                email:          getString(clientRaw.email) ?? "",
            }
            : fallbackClientName || fallbackDocumentType || fallbackDocumentNumber || fallbackClientEmail
              ? {
                    id:             getNumber(payload.clientId ?? payload.client_id) ?? 0,
                    businessName:   fallbackClientName,
                    documentType:   fallbackDocumentType,
                    documentNumber: fallbackDocumentNumber,
                    email:          fallbackClientEmail,
                }
              : null,
    };
}

function mapPayment(payload: unknown): Payment {
    if (!isObject(payload)) throw new Error("La API devolvió un Pago inválido.");

    const stripeSecret =
        getString(payload.stripeClientSecret ?? payload.stripe_client_secret) ?? undefined;

    return {
        paymentId:                getNumber(payload.paymentId ?? payload.id) ?? 0,
        contractId:               getNumber(payload.contractId ?? payload.contract_id) ?? 0,
        amount:                   getNumber(payload.amount) ?? 0,
        paymentStatus:            normalizePaymentStatus(payload.paymentStatus ?? payload.payment_status),
        paymentMethod:            normalizePaymentMethod(payload.paymentMethod ?? payload.payment_method),
        paymentReference:         getString(payload.paymentReference ?? payload.payment_reference) ?? "",
        paymentExternalReference: getString(payload.paymentExternalReference ?? payload.payment_external_reference),
        createdAt:                getString(payload.createdAt ?? payload.created_at) ?? "",
        ...(stripeSecret ? { stripeClientSecret: stripeSecret } : {}),
    };
}

function buildCreatePaymentBody(input: CreatePaymentInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
        contractId: input.contractId,
        amount: input.amount,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
    };
    const ref = typeof input.paymentReference === "string" ? input.paymentReference.trim() : "";
    if (ref) body.paymentReference = ref;
    if (input.paymentExternalReference != null && String(input.paymentExternalReference).trim()) {
        body.paymentExternalReference = String(input.paymentExternalReference).trim();
    }
    return body;
}

// ─────────────────────────────────────────────────────────────
// PATHS
// ─────────────────────────────────────────────────────────────

const SALES_BASE             = "/api/sales";
const RENTAL_UNITS_PATH      = `${SALES_BASE}/rental-units`;
const RESERVATIONS_PATH      = `${SALES_BASE}/reservations`;
const CONTRACTS_PATH         = `${SALES_BASE}/contracts`;
const CONTRACT_UNITS_PATH    = `${SALES_BASE}/contract-rental-units`;
const AVAILABILITY_PATH      = `${SALES_BASE}/availability`;
const PAYMENTS_PATH          = `${SALES_BASE}/payments`;

// ─────────────────────────────────────────────────────────────
// RENTAL UNITS
// ─────────────────────────────────────────────────────────────

export async function listRentalUnits(filters?: {
    startDate?: string;
    endDate?: string;
}): Promise<RentalUnit[]> {
    const query: Record<string, string> = {};
    if (filters?.startDate) query.startDate = filters.startDate;
    if (filters?.endDate)   query.endDate   = filters.endDate;

    const payload = await httpClient.get<unknown>(RENTAL_UNITS_PATH, {
        query: Object.keys(query).length > 0 ? query : undefined,
    });

    const mapped = extractCollection(payload).map(mapRentalUnit);
    return hydrateRentalUnitsWithWarehouses(mapped);
}

export async function getRentalUnit(id: number): Promise<RentalUnit> {
    const payload = await httpClient.get<unknown>(`${RENTAL_UNITS_PATH}/${id}`);
    const mapped = mapRentalUnit(payload);
    const [hydrated] = await hydrateRentalUnitsWithWarehouses([mapped]);
    return hydrated;
}

function asBool(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1) return true;
    if (value === "false" || value === 0) return false;
    return null;
}

function mapWarehouseCatalogCard(payload: unknown): RentalUnitWarehouseCatalogCardDTO {
    if (!isObject(payload)) throw new Error("La API devolvió una catalog card inválida.");
    const p = payload;

    const rentalUnitId = getNumber(p.rentalUnitId ?? p.rental_unit_id) ?? 0;
    const warehouseId = getNumber(p.warehouseId ?? p.warehouse_id) ?? 0;

    return {
        rentalUnitId,
        offerScope: (getString(p.offerScope ?? p.offer_scope) ?? "WAREHOUSE_FULL") as WarehouseCatalogOfferScope,
        warehouseId,
        warehouseCode: getString(p.warehouseCode ?? p.warehouse_code) ?? "",
        warehouseName: getString(p.warehouseName ?? p.warehouse_name) ?? "",
        warehouseLocation: getString(p.warehouseLocation ?? p.warehouse_location),
        warehouseActive: asBool(p.warehouseActive ?? p.warehouse_active),
        cityId: getNumber(p.cityId ?? p.city_id),
        cityName: getString(p.cityName ?? p.city_name),
        warehouseTypeId: getNumber(p.warehouseTypeId ?? p.warehouse_type_id),
        warehouseTypeName: getString(p.warehouseTypeName ?? p.warehouse_type_name),
        warehouseTypeDescription: getString(p.warehouseTypeDescription ?? p.warehouse_type_description),
        totalWarehouseCapacityM2: getNumber(p.totalWarehouseCapacityM2 ?? p.total_warehouse_capacity_m2),
        offeredAreaM2: getNumber(p.offeredAreaM2 ?? p.offered_area_m2),
        registeredSectorsCount: getNumber(p.registeredSectorsCount ?? p.registered_sectors_count),
        registeredStorageSpacesCount: getNumber(
            p.registeredStorageSpacesCount ?? p.registered_storage_spaces_count
        ),
        warehouseStatusCode: getString(p.warehouseStatusCode ?? p.warehouse_status_code),
        warehouseStatusDescription: getString(p.warehouseStatusDescription ?? p.warehouse_status_description),
        warehouseStatusOperational: asBool(p.warehouseStatusOperational ?? p.warehouse_status_operational),
        locationSummaryLine: getString(p.locationSummaryLine ?? p.location_summary_line),
        unitTitleLabel: getString(p.unitTitleLabel ?? p.unit_title_label),
    };
}

/**
 * Ficha enriquecida para oferta “bodega completa”. Devuelve null si el id no califica (404).
 */
export async function getRentalUnitWarehouseCatalogCard(
    id: number
): Promise<RentalUnitWarehouseCatalogCardDTO | null> {
    try {
        const payload = await httpClient.get<unknown>(`${RENTAL_UNITS_PATH}/${id}/catalog-card`);
        return mapWarehouseCatalogCard(payload);
    } catch (err: unknown) {
        if (isApiError(err) && err.status === 404) {
            return null;
        }
        throw err;
    }
}

export async function createRentalUnit(input: CreateRentalUnitInput): Promise<RentalUnit> {
    const payload = await httpClient.post<unknown>(RENTAL_UNITS_PATH, input);
    const mapped = mapRentalUnit(payload);
    const [hydrated] = await hydrateRentalUnitsWithWarehouses([mapped]);
    return hydrated;
}

export async function updateRentalUnit(id: number, input: CreateRentalUnitInput): Promise<RentalUnit> {
    const payload = await httpClient.put<unknown>(`${RENTAL_UNITS_PATH}/${id}`, input);
    const mapped = mapRentalUnit(payload);
    const [hydrated] = await hydrateRentalUnitsWithWarehouses([mapped]);
    return hydrated;
}

export async function deleteRentalUnit(id: number): Promise<void> {
    await httpClient.delete<unknown>(`${RENTAL_UNITS_PATH}/${id}`);
}

function mapRentalUnitPricingRow(raw: unknown): RentalUnitPricingRow {
    if (!isObject(raw)) {
        throw new Error("Fila de pricing inválida.");
    }
    const p = raw as Record<string, unknown>;
    const rentalUnitId = getNumber(p.rentalUnitId ?? p.rental_unit_id) ?? 0;
    const referenceId = getNumber(p.referenceId ?? p.reference_id);
    const basePrice = getNumber(p.basePrice ?? p.base_price) ?? 0;
    const currency = (getString(p.currency) ?? "").toUpperCase();
    const priceActive = Boolean(p.priceActive ?? p.price_active);
    return {
        rentalUnitId,
        entityTypeName: getString(p.entityTypeName ?? p.entity_type_name) ?? "",
        referenceType: getString(p.referenceType ?? p.reference_type) ?? "",
        referenceId,
        referenceCode: getString(p.referenceCode ?? p.reference_code) ?? "",
        referenceName: getString(p.referenceName ?? p.reference_name) ?? "",
        basePrice,
        currency,
        priceActive,
        priceUpdatedAt: getString(p.priceUpdatedAt ?? p.price_updated_at),
        priceUpdatedBy: getString(p.priceUpdatedBy ?? p.price_updated_by),
    };
}

export type ListRentalUnitsPricingParams = {
    readyOnly?: boolean;
    activeOnly?: boolean;
};

/**
 * GET /api/sales/rental-units/pricing
 * Roles: ADMIN, SALES_AGENT
 */
export async function listRentalUnitsPricing(
    params?: ListRentalUnitsPricingParams
): Promise<RentalUnitPricingRow[]> {
    const query: Record<string, boolean> = {};
    if (params?.readyOnly === true) query.readyOnly = true;
    if (params?.readyOnly === false) query.readyOnly = false;
    if (params?.activeOnly === true) query.activeOnly = true;
    if (params?.activeOnly === false) query.activeOnly = false;

    const payload = await httpClient.get<unknown>(`${RENTAL_UNITS_PATH}/pricing`, {
        query: Object.keys(query).length > 0 ? query : undefined,
    });
    return extractCollection(payload).map(mapRentalUnitPricingRow);
}

/**
 * PATCH /api/sales/rental-units/{id}/pricing
 * Rol: ADMIN
 */
export async function patchRentalUnitPricing(
    id: number,
    input: UpdateRentalUnitPricingInput
): Promise<RentalUnitPricingRow | null> {
    const body = {
        basePrice: input.basePrice,
        currency: input.currency.trim().toUpperCase(),
        priceActive: input.priceActive,
    };
    const payload = await httpClient.patch<unknown>(`${RENTAL_UNITS_PATH}/${id}/pricing`, body);
    if (payload == null || payload === "") return null;
    if (isObject(payload) && Object.keys(payload).length === 0) return null;
    try {
        return mapRentalUnitPricingRow(payload);
    } catch {
        return null;
    }
}

/**
 * POST /api/sales/rental-units/sync — alinea rental units con el inventario físico (ADMIN).
 * Idempotente en UX: deshabilitar doble envío desde la pantalla que lo invoque.
 */
export async function syncRentalUnitsCatalog(): Promise<string | null> {
    const payload = await httpClient.post<unknown>(`${RENTAL_UNITS_PATH}/sync`, {});
    if (typeof payload === "string" && payload.trim()) return payload.trim();
    if (!isObject(payload)) return null;
    const o = payload as Record<string, unknown>;
    return (
        getString(o.message) ??
        getString(o.detail) ??
        getString(o.status) ??
        null
    );
}

// ─────────────────────────────────────────────────────────────
// DISPONIBILIDAD
// ─────────────────────────────────────────────────────────────

export async function validateAvailability(input: ValidateAvailabilityInput): Promise<boolean> {
    const result = await httpClient.post<unknown>(`${AVAILABILITY_PATH}/validate`, input);
    if (typeof result === "boolean") return result;
    if (isObject(result)) {
        return Boolean(result.available ?? result.isAvailable ?? result.result ?? result.valid);
    }
    return false;
}

export async function validateBulkAvailability(input: ValidateBulkAvailabilityInput): Promise<boolean> {
    const result = await httpClient.post<unknown>(`${AVAILABILITY_PATH}/validate-bulk`, input);
    if (typeof result === "boolean") return result;
    if (isObject(result)) {
        return Boolean(result.available ?? result.isAvailable ?? result.result ?? result.valid);
    }
    return false;
}

export async function getOccupancySummary(params: {
    warehouseId?: number;
    sectorId?: number;
    storageSpaceId?: number;
}): Promise<OccupancySummary> {
    const query: Record<string, number> = {};
    if (params.warehouseId)    query.warehouseId    = params.warehouseId;
    if (params.sectorId)       query.sectorId       = params.sectorId;
    if (params.storageSpaceId) query.storageSpaceId = params.storageSpaceId;

    const payload = await httpClient.get<unknown>(AVAILABILITY_PATH, { query });

    if (!isObject(payload)) throw new Error("Respuesta de ocupación inválida.");

    return {
        total:     getNumber(payload.total)     ?? 0,
        available: getNumber(payload.available) ?? 0,
        occupied:  getNumber(payload.occupied)  ?? 0,
        reserved:  getNumber(payload.reserved)  ?? 0,
        free:      getNumber(payload.free)      ?? 0,
    };
}

// ─────────────────────────────────────────────────────────────
// RESERVAS
// ─────────────────────────────────────────────────────────────

export async function listReservations(): Promise<Reservation[]> {
    const payload = await httpClient.get<unknown>(RESERVATIONS_PATH);
    return extractCollection(payload).map(mapReservation);
}

export async function getReservationById(id: number): Promise<Reservation> {
    const payload = await httpClient.get<unknown>(`${RESERVATIONS_PATH}/id/${id}`);
    return mapReservation(payload);
}

export async function getReservationByToken(token: string): Promise<Reservation> {
    const payload = await httpClient.get<unknown>(`${RESERVATIONS_PATH}/token/${token}`);
    return mapReservation(payload);
}

/**
 * Cuerpo alineado con CreateReservationRequestDTO del API (camelCase, solo campos contractuales).
 */
function buildReservationCreateHttpBody(input: CreateReservationInput): CreateReservationRequestPayload {
    const rentalUnitIds = input.units
        .map(u => u.rentalUnitId)
        .filter((id): id is number => id != null && Number.isFinite(id) && id > 0);

    if (rentalUnitIds.length === 0) {
        throw new Error("Al menos una unidad de arrendamiento es requerida.");
    }

    return {
        clientId: input.clientId,
        rentalUnitIds,
        startDate: input.startDate,
        endDate: input.endDate,
    };
}

/** Forma exacta del POST /api/sales/reservations (documentación API). */
type CreateReservationRequestPayload = {
    clientId: number;
    rentalUnitIds: number[];
    startDate: string;
    endDate: string;
};

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
    const payload = await httpClient.post<unknown>(RESERVATIONS_PATH, buildReservationCreateHttpBody(input));
    return mapReservation(payload);
}

export async function cancelReservation(token: string): Promise<void> {
    await httpClient.patch<unknown>(`${RESERVATIONS_PATH}/${token}/cancel`, {});
}

// ─────────────────────────────────────────────────────────────
// CONTRATOS
// ─────────────────────────────────────────────────────────────

export async function listContracts(): Promise<Contract[]> {
    const payload = await httpClient.get<unknown>(CONTRACTS_PATH);
    return extractCollection(payload).map(mapContract);
}

/** Contratos activos del usuario autenticado (CLIENT): GET /api/sales/contracts/me/active */
export async function getMyActiveContracts(): Promise<Contract[]> {
    const payload = await httpClient.get<unknown>(`${CONTRACTS_PATH}/me/active`);
    return extractCollection(payload).map(mapContract);
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
    const payload = await httpClient.post<unknown>(CONTRACTS_PATH, input);
    return mapContract(payload);
}

export async function getContractById(contractId: number): Promise<Contract> {
    const payload = await httpClient.get<unknown>(`${CONTRACTS_PATH}/${contractId}`);
    return mapContract(payload);
}

export async function completeContract(contractId: number): Promise<Contract> {
    const payload = await httpClient.patch<unknown>(`${CONTRACTS_PATH}/${contractId}/complete`, {});
    return mapContract(payload);
}

export async function cancelContract(contractId: number): Promise<Contract> {
    const payload = await httpClient.patch<unknown>(`${CONTRACTS_PATH}/${contractId}/cancel`, {});
    return mapContract(payload);
}

export async function listContractRentalUnits(contractId: number): Promise<ContractRentalUnit[]> {
    const payload = await httpClient.get<unknown>(
        `${CONTRACT_UNITS_PATH}/contract/${contractId}`
    );
    return extractCollection(payload).map((u) => mapContractRentalUnit(contractId, u));
}

// ─────────────────────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────────────────────

export async function registerPayment(input: CreatePaymentInput): Promise<Payment> {
    const payload = await httpClient.post<unknown>(PAYMENTS_PATH, buildCreatePaymentBody(input));
    return mapPayment(payload);
}

export async function listContractPayments(contractId: number): Promise<Payment[]> {
    const payload = await httpClient.get<unknown>(`${PAYMENTS_PATH}/contract/${contractId}`);
    return extractCollection(payload).map(mapPayment);
}
