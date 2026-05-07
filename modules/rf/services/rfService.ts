import type {
    CreateReceptionBody,
    ReceptionCreatedResponse,
    RfCompleteReceptionBody,
    RfConfirmBody,
    RfConfirmResponse,
    RfScanBody,
    RfScanResponse,
} from "@/modules/warehouse/api/operatorInventoryTypes";
import { mapRfConfirmResponseToViewModel, mapRfScanResponseToViewModel } from "@/modules/rf/mappers/rfApiMapper";
import type { RFConfirmViewModel, RFScanViewModel } from "@/modules/rf/viewModels/rfViewModels";
import { httpClient } from "@/shared/api/httpClient";

const RF_BASE = "/api/inventory/rf";
const RECEPTIONS_BASE = "/api/inventory/receptions";

/** Backend envuelve muchas respuestas en `ApiResponse<T>`; la carga útil está en `data`. */
function unwrapApiData<T>(raw: unknown): T {
    if (raw && typeof raw === "object" && "data" in raw) {
        const d = (raw as { data: unknown }).data;
        return d as T;
    }
    return raw as T;
}

function isNetworkError(error: unknown): boolean {
    return error instanceof DOMException || (error instanceof TypeError && /fetch/i.test(error.message));
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await operation(controller.signal);
    } finally {
        clearTimeout(timer);
    }
}

async function withRetry<T>(operation: () => Promise<T>, retries = 1, delayMs = 450): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isNetworkError(error) || attempt === retries) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
    }
    throw lastError;
}

export async function openRFReception(body: CreateReceptionBody): Promise<ReceptionCreatedResponse> {
    return withRetry(
        () =>
            withTimeout(async (signal) => {
                const raw = await httpClient.post<unknown>(RECEPTIONS_BASE, body, { signal });
                return unwrapApiData<ReceptionCreatedResponse>(raw);
            }, 9000),
        1
    );
}

export async function completeRFReception(
    receptionId: number,
    body: RfCompleteReceptionBody
): Promise<void> {
    await withRetry(
        () =>
            withTimeout(
                (signal) =>
                    httpClient.patch<void>(`${RF_BASE}/reception/${receptionId}/complete`, body, {
                        signal,
                    }),
                9000
            ),
        1
    );
}

async function rfScanRequest(body: RfScanBody): Promise<RfScanResponse> {
    return withRetry(
        () =>
            withTimeout(async (signal) => {
                const raw = await httpClient.post<unknown>(`${RF_BASE}/scan`, body, { signal });
                return unwrapApiData<RfScanResponse>(raw);
            }, 7000),
        1
    );
}

async function rfConfirmRequest(body: RfConfirmBody): Promise<RfConfirmResponse> {
    return withRetry(
        () =>
            withTimeout(async (signal) => {
                const raw = await httpClient.post<unknown>(`${RF_BASE}/confirm`, body, { signal });
                return unwrapApiData<RfConfirmResponse>(raw);
            }, 9000),
        1
    );
}

/** Escaneo RF: respuesta ya normalizada para la UI. */
export async function rfScan(body: RfScanBody): Promise<RFScanViewModel> {
    const raw = await rfScanRequest(body);
    return mapRfScanResponseToViewModel(raw);
}

/** Confirmación RF: respuesta ya normalizada para la UI. */
export async function rfConfirm(body: RfConfirmBody): Promise<RFConfirmViewModel> {
    const raw = await rfConfirmRequest(body);
    return mapRfConfirmResponseToViewModel(raw);
}

export function isRFTransientError(error: unknown): boolean {
    return isNetworkError(error);
}
