import { beforeEach, describe, expect, it } from "vitest";

import {
    getRFStoreState,
    resetRFStore,
    setRFDetected,
    setRFError,
    setRFState,
    subscribeRFStore,
} from "./useRFStore";

describe("useRFStore", () => {
    beforeEach(() => {
        resetRFStore();
    });

    it("inicia en idle sin error", () => {
        const s = getRFStoreState();
        expect(s.state).toBe("idle");
        expect(s.lastScan).toBeNull();
        expect(s.errorMessage).toBeNull();
    });

    it("setRFDetected pasa a detected y guarda el escaneo", () => {
        setRFDetected({ code: "SKU-1", source: "manual", scannedAt: 42 });
        const s = getRFStoreState();
        expect(s.state).toBe("detected");
        expect(s.lastScan?.code).toBe("SKU-1");
        expect(s.errorMessage).toBeNull();
    });

    it("setRFError pasa a error con mensaje", () => {
        setRFError("fallo");
        const s = getRFStoreState();
        expect(s.state).toBe("error");
        expect(s.errorMessage).toBe("fallo");
    });

    it("setRFState actualiza solo el estado", () => {
        setRFState("scanning");
        expect(getRFStoreState().state).toBe("scanning");
    });

    it("subscribeRFStore notifica cambios", () => {
        const states: string[] = [];
        const unsub = subscribeRFStore((next) => {
            states.push(next.state);
        });
        setRFState("confirming");
        unsub();
        expect(states.includes("confirming")).toBe(true);
    });
});
