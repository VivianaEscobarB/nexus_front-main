import type { RfConfirmResponse, RfScanResponse } from "@/modules/warehouse/api/operatorInventoryTypes";

import type { RFConfirmViewModel, RFScanViewModel } from "@/modules/rf/viewModels/rfViewModels";

export function mapRfScanResponseToViewModel(raw: RfScanResponse): RFScanViewModel {
    const expected = Number.isFinite(raw.expectedQuantity) ? raw.expectedQuantity : 0;
    const received = Number.isFinite(raw.receivedQuantity) ? Number(raw.receivedQuantity) : 0;
    const remaining = Number.isFinite(raw.remainingQuantity)
        ? Number(raw.remainingQuantity)
        : Math.max(0, expected - received);
    return {
        receptionLineId: raw.receptionLineId,
        productName: raw.productName ?? raw.externalProductRef ?? "",
        externalProductRef: raw.externalProductRef ?? null,
        productSku: raw.productSku ?? null,
        expectedQuantity: expected,
        receivedQuantity: received,
        remainingQuantity: remaining,
        requiresLot: Boolean(raw.requiresLot),
        suggestedStorageSpaceId: raw.suggestedStorageSpaceId ?? null,
        suggestedStorageSpaceCode: raw.suggestedStorageSpaceCode ?? null,
    };
}

export function mapRfConfirmResponseToViewModel(raw: RfConfirmResponse): RFConfirmViewModel {
    return {
        statusLabel: raw.status != null && raw.status !== "" ? String(raw.status) : "—",
        quantityDifference: Number.isFinite(raw.difference) ? raw.difference : 0,
        alertRaised: Boolean(raw.alertCreated),
    };
}

export function formatRFConfirmSummary(vm: RFConfirmViewModel): string {
    const base = `Registrado. Estado: ${vm.statusLabel}. Diferencia: ${vm.quantityDifference}.`;
    return vm.alertRaised ? `${base} Se generó una alerta.` : base;
}
