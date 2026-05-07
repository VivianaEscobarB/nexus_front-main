import type { RfConfirmResponse, RfScanResponse } from "@/modules/warehouse/api/operatorInventoryTypes";

import type { RFConfirmViewModel, RFScanViewModel } from "@/modules/rf/viewModels/rfViewModels";

export function mapRfScanResponseToViewModel(raw: RfScanResponse): RFScanViewModel {
    return {
        receptionLineId: raw.receptionLineId,
        productName: raw.productName ?? "",
        productSku: raw.productSku ?? null,
        expectedQuantity: raw.expectedQuantity ?? 0,
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
