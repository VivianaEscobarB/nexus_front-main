import React from "react";

export function RFScannerOverlay() {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-[85%] max-w-xs rounded-xl border-2 border-brand-strong/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
        </div>
    );
}
