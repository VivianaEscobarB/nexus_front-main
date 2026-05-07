export type RFState =
    | "idle"
    | "scanning"
    | "detected"
    | "confirming"
    | "success"
    | "error";

export interface RFScanResult {
    code: string;
    source: "camera" | "manual";
    scannedAt: number;
}

export interface RFErrorState {
    message: string;
}

export interface RFCameraDevice {
    deviceId: string;
    label: string;
}
