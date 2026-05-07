import type { RFScanResult, RFState } from "@/modules/rf/types/rfTypes";

type RFStoreState = {
    state: RFState;
    lastScan: RFScanResult | null;
    errorMessage: string | null;
};

let rfStoreState: RFStoreState = {
    state: "idle",
    lastScan: null,
    errorMessage: null,
};

const listeners = new Set<(next: RFStoreState) => void>();

function emit(): void {
    listeners.forEach((listener) => listener(rfStoreState));
}

function setStore(next: Partial<RFStoreState>): void {
    rfStoreState = { ...rfStoreState, ...next };
    emit();
}

export function getRFStoreState(): RFStoreState {
    return rfStoreState;
}

export function subscribeRFStore(listener: (next: RFStoreState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setRFState(state: RFState): void {
    setStore({ state });
}

export function setRFDetected(scan: RFScanResult): void {
    setStore({ state: "detected", lastScan: scan, errorMessage: null });
}

export function setRFError(message: string): void {
    setStore({ state: "error", errorMessage: message });
}

export function clearRFError(): void {
    if (rfStoreState.errorMessage) {
        setStore({ errorMessage: null });
    }
}

export function resetRFStore(): void {
    setStore({ state: "idle", lastScan: null, errorMessage: null });
}
