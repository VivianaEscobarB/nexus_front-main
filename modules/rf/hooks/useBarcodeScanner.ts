import { BrowserMultiFormatReader, NotFoundException } from "@zxing/browser";
import React from "react";

import { appEnv } from "@/lib/config/env";
import { trackRFEvent } from "@/modules/rf/services/rfTelemetry";
import type { RFCameraDevice } from "@/modules/rf/types/rfTypes";
import { resetBarcodeDeduplicator, shouldIgnoreDuplicateBarcode } from "@/modules/rf/utils/barcodeDeduplicator";

type UseBarcodeScannerParams = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onCodeDetected: (code: string) => Promise<void> | void;
    onError: (message: string) => void;
    onHint: (message: string | null) => void;
};

export function useBarcodeScanner({
    videoRef,
    onCodeDetected,
    onError,
    onHint,
}: UseBarcodeScannerParams) {
    const ROI_RATIO = 0.62;
    const [isScanning, setIsScanning] = React.useState(false);
    const [devices, setDevices] = React.useState<RFCameraDevice[]>([]);
    const [deviceId, setDeviceId] = React.useState<string>("");

    const detectorRef = React.useRef<BarcodeDetector | null>(null);
    const zxingReaderRef = React.useRef<BrowserMultiFormatReader | null>(null);
    const detectTimerRef = React.useRef<number | null>(null);
    const detectInFlightRef = React.useRef(false);
    const roiCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const scanStartedAtRef = React.useRef<number | null>(null);

    const stop = React.useCallback(() => {
        if (detectTimerRef.current != null) {
            window.clearInterval(detectTimerRef.current);
            detectTimerRef.current = null;
        }
        detectInFlightRef.current = false;

        zxingReaderRef.current?.reset();
        zxingReaderRef.current = null;

        const video = videoRef.current;
        const stream = video?.srcObject as MediaStream | null;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        if (video) {
            video.srcObject = null;
        }

        resetBarcodeDeduplicator();
        setIsScanning(false);
    }, [videoRef]);

    const runDetectedCode = React.useCallback(
        async (rawValue: string) => {
            const code = rawValue.trim();
            if (!code) return;
            if (shouldIgnoreDuplicateBarcode(code, 1500)) return;
            if (
                appEnv.rfHapticsEnabled &&
                typeof navigator !== "undefined" &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(45);
            }
            trackRFEvent("scan_success", { source: "camera", codeLength: code.length });
            if (scanStartedAtRef.current) {
                trackRFEvent("scan_time", {
                    source: "camera",
                    ms: Date.now() - scanStartedAtRef.current,
                });
            }
            await onCodeDetected(code);
            stop();
        },
        [onCodeDetected, stop]
    );

    const detectInRoi = React.useCallback(async (video: HTMLVideoElement): Promise<string | null> => {
        if (!detectorRef.current || video.videoWidth === 0 || video.videoHeight === 0) return null;

        const roiW = Math.floor(video.videoWidth * ROI_RATIO);
        const roiH = Math.floor(video.videoHeight * ROI_RATIO);
        const roiX = Math.floor((video.videoWidth - roiW) / 2);
        const roiY = Math.floor((video.videoHeight - roiH) / 2);

        if (!roiCanvasRef.current) {
            roiCanvasRef.current = document.createElement("canvas");
        }
        const canvas = roiCanvasRef.current;
        canvas.width = roiW;
        canvas.height = roiH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
        const codes = await detectorRef.current.detect(canvas);
        return codes[0]?.rawValue?.trim() || null;
    }, []);

    const loadDevices = React.useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = mediaDevices
            .filter((d) => d.kind === "videoinput")
            .map((d, idx) => ({
                deviceId: d.deviceId,
                label: d.label || `Cámara ${idx + 1}`,
            }));
        setDevices(cameras);
        if (!deviceId && cameras[0]) {
            setDeviceId(cameras[0].deviceId);
        }
    }, [deviceId]);

    const start = React.useCallback(async () => {
        onError("");
        onHint(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            onError("Este dispositivo no permite acceso a la cámara desde el navegador.");
            return;
        }

        stop();
        scanStartedAtRef.current = Date.now();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: { ideal: "environment" } },
                audio: false,
            });

            const video = videoRef.current;
            if (!video) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            video.srcObject = stream;
            await video.play();
            setIsScanning(true);
            await loadDevices();

            if (typeof window.BarcodeDetector === "function") {
                detectorRef.current = new window.BarcodeDetector({
                    formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
                });

                detectTimerRef.current = window.setInterval(async () => {
                    if (
                        detectInFlightRef.current ||
                        !videoRef.current ||
                        videoRef.current.readyState < 2 ||
                        !detectorRef.current
                    ) {
                        return;
                    }
                    detectInFlightRef.current = true;
                    try {
                        const raw = await detectInRoi(videoRef.current);
                        if (raw) {
                            await runDetectedCode(raw);
                        }
                    } catch {
                        // ignore frame parse errors
                    } finally {
                        detectInFlightRef.current = false;
                    }
                }, 280);
                return;
            }

            if (!appEnv.rfZxingFallbackEnabled) {
                onError(
                    "Este navegador no ofrece lector de códigos integrado. Usa el ingreso manual o un navegador compatible."
                );
                stop();
                return;
            }

            onHint("Fallback ZXing activo. Para mejor lectura, centra el código en el marco.");
            const reader = new BrowserMultiFormatReader();
            zxingReaderRef.current = reader;
            void reader.decodeFromVideoDevice(undefined, video, async (result, error) => {
                if (result?.getText()) {
                    await runDetectedCode(result.getText());
                    return;
                }
                if (error && !(error instanceof NotFoundException)) {
                    onError("No fue posible decodificar con ZXing. Intenta con ingreso manual.");
                }
            });
        } catch {
            onError("No se pudo usar la cámara. Revisa permisos o usa la entrada manual del código.");
            trackRFEvent("camera_permission_error", { source: "camera" });
        }
    }, [detectInRoi, deviceId, loadDevices, onError, onHint, runDetectedCode, stop, videoRef]);

    React.useEffect(() => {
        return () => stop();
    }, [stop]);

    return {
        isScanning,
        start,
        stop,
        devices,
        deviceId,
        setDeviceId,
        refreshDevices: loadDevices,
    };
}
