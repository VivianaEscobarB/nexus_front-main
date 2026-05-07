import { appEnv } from "@/lib/config/env";

export type RFTelemetryEventName =
    | "scan_success"
    | "manual_entry"
    | "camera_permission_error"
    | "scan_time"
    | "confirm_time";

export type RFTelemetryPayload = Record<string, unknown>;

export function trackRFEvent(name: RFTelemetryEventName, payload: RFTelemetryPayload = {}): void {
    if (typeof window === "undefined") return;
    if (!appEnv.rfTelemetryEnabled) return;

    const detail = {
        name,
        payload,
        timestamp: Date.now(),
    };

    window.dispatchEvent(new CustomEvent("rf-telemetry", { detail }));

    if (appEnv.isDevelopment) {
        console.debug("[rf-telemetry]", detail);
    }
}
