import { describe, expect, it } from "vitest";

import {
    formatRFConfirmSummary,
    mapRfConfirmResponseToViewModel,
    mapRfScanResponseToViewModel,
} from "./rfApiMapper";

describe("rfApiMapper", () => {
    it("mapRfScanResponseToViewModel normaliza nulos y booleanos", () => {
        const vm = mapRfScanResponseToViewModel({
            receptionLineId: 9,
            productName: "Test",
            expectedQuantity: 3,
            requiresLot: true,
            productSku: undefined,
            suggestedStorageSpaceId: null,
            suggestedStorageSpaceCode: undefined,
        });
        expect(vm).toEqual({
            receptionLineId: 9,
            productName: "Test",
            externalProductRef: null,
            productSku: null,
            expectedQuantity: 3,
            receivedQuantity: 0,
            remainingQuantity: 3,
            requiresLot: true,
            suggestedStorageSpaceId: null,
            suggestedStorageSpaceCode: null,
        });
    });

    it("mapRfConfirmResponseToViewModel tolera valores laxos", () => {
        const vm = mapRfConfirmResponseToViewModel({
            status: "",
            difference: NaN,
            alertCreated: 1 as unknown as boolean,
        });
        expect(vm.statusLabel).toBe("—");
        expect(vm.quantityDifference).toBe(0);
        expect(vm.alertRaised).toBe(true);
    });

    it("formatRFConfirmSummary incluye alerta cuando aplica", () => {
        const a = formatRFConfirmSummary({
            statusLabel: "OK",
            quantityDifference: 2,
            alertRaised: false,
        });
        expect(a).toContain("OK");
        expect(a).toContain("2");
        expect(a).not.toContain("alerta");

        const b = formatRFConfirmSummary({
            statusLabel: "OK",
            quantityDifference: 0,
            alertRaised: true,
        });
        expect(b).toContain("alerta");
    });
});
