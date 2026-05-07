import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetBarcodeDeduplicator, shouldIgnoreDuplicateBarcode } from "./barcodeDeduplicator";

describe("barcodeDeduplicator", () => {
    beforeEach(() => {
        resetBarcodeDeduplicator();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        resetBarcodeDeduplicator();
    });

    it("trata códigos vacíos como duplicado ignorado", () => {
        expect(shouldIgnoreDuplicateBarcode("")).toBe(true);
        expect(shouldIgnoreDuplicateBarcode("   ")).toBe(true);
    });

    it("acepta la primera lectura", () => {
        expect(shouldIgnoreDuplicateBarcode("ABC123")).toBe(false);
    });

    it("ignora la misma lectura dentro de la ventana", () => {
        expect(shouldIgnoreDuplicateBarcode("X", 1000)).toBe(false);
        expect(shouldIgnoreDuplicateBarcode("X", 1000)).toBe(true);
    });

    it("acepta la misma lectura tras vencer la ventana", () => {
        expect(shouldIgnoreDuplicateBarcode("Y", 500)).toBe(false);
        vi.advanceTimersByTime(500);
        expect(shouldIgnoreDuplicateBarcode("Y", 500)).toBe(false);
    });

    it("no mezcla códigos distintos", () => {
        expect(shouldIgnoreDuplicateBarcode("A")).toBe(false);
        expect(shouldIgnoreDuplicateBarcode("B")).toBe(false);
    });
});
