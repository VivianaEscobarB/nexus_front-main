let lastCode = "";
let lastScanAt = 0;

export function shouldIgnoreDuplicateBarcode(code: string, windowMs = 1500): boolean {
    const now = Date.now();
    const normalized = code.trim();

    if (!normalized) {
        return true;
    }

    const isDuplicate = lastCode === normalized && now - lastScanAt < windowMs;
    if (!isDuplicate) {
        lastCode = normalized;
        lastScanAt = now;
    }

    return isDuplicate;
}

export function resetBarcodeDeduplicator(): void {
    lastCode = "";
    lastScanAt = 0;
}
