import { appEnv } from "@/lib/config/env";
import { ApiError, buildApiError } from "@/shared/api/apiError";

const DEFAULT_CSRF_HEADER_NAME = appEnv.csrfHeaderName;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_ENDPOINT_PATH = "/api/csrf";

interface CsrfBootstrapResponse {
    headerName?: string;
    token?: string;
}

export interface CsrfState {
    token: string | null;
    headerName: string;
}

const csrfState: CsrfState = {
    token: null,
    headerName: DEFAULT_CSRF_HEADER_NAME,
};

let csrfBootstrapPromise: Promise<CsrfState> | null = null;
let csrfRefreshPromise: Promise<CsrfState> | null = null;

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function parsePayload<T>(response: Response): Promise<T> {
    const text = await response.text();

    if (!text) {
        return undefined as T;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

function normalizeCsrfPayload(payload: unknown): CsrfBootstrapResponse {
    if (!isObject(payload)) {
        return {};
    }

    return {
        headerName: getString(payload.headerName) ?? undefined,
        token: getString(payload.token) ?? undefined,
    };
}

function maskTokenForLog(token: string | null): string | null {
    if (!token) {
        return null;
    }

    if (token.length <= 12) {
        return token;
    }

    return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function logCsrfBootstrap(nextState: CsrfState, forceRefresh: boolean): void {
    if (!appEnv.isDevelopment) {
        return;
    }

    console.info("[csrf] token initialized", {
        reason: forceRefresh ? "refresh" : "bootstrap",
        headerName: nextState.headerName,
        tokenPreview: maskTokenForLog(nextState.token),
    });
}

function logCsrfRefresh(): void {
    if (!appEnv.isDevelopment) {
        return;
    }

    console.info("[csrf] refreshing token after 403");
}

async function waitForCookieSynchronization(): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

function updateCsrfState(payload: CsrfBootstrapResponse): CsrfState {
    csrfState.token = payload.token ?? null;
    csrfState.headerName = payload.headerName ?? DEFAULT_CSRF_HEADER_NAME;

    return getCsrfStateSnapshot();
}

export function isMutatingMethod(method: string): boolean {
    return MUTATING_METHODS.has(method.toUpperCase());
}

export function getCsrfHeaderName(): string {
    return csrfState.headerName || DEFAULT_CSRF_HEADER_NAME;
}

function resetCsrfState(): void {
    csrfState.token = null;
    csrfState.headerName = DEFAULT_CSRF_HEADER_NAME;
}

function getCsrfStateSnapshot(): CsrfState {
    return {
        token: csrfState.token,
        headerName: csrfState.headerName,
    };
}

interface EnsureCsrfTokenOptions {
    forceRefresh?: boolean;
}

export async function ensureCsrfToken(
    options: EnsureCsrfTokenOptions = {}
): Promise<CsrfState> {
    const { forceRefresh = false } = options;

    if (!forceRefresh && csrfState.token) {
        return getCsrfStateSnapshot();
    }

    if (csrfBootstrapPromise) {
        return csrfBootstrapPromise;
    }

    if (forceRefresh) {
        resetCsrfState();
    }

    const url = new URL(CSRF_ENDPOINT_PATH, appEnv.apiBaseUrl).toString();

    csrfBootstrapPromise = (async () => {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            credentials: "include",
        });

        const payload = await parsePayload<unknown>(response);

        if (!response.ok) {
            throw buildApiError(payload, response.status, CSRF_ENDPOINT_PATH);
        }

        // Allow the browser event loop to apply Set-Cookie before any mutating request continues.
        await waitForCookieSynchronization();

        const normalizedPayload = normalizeCsrfPayload(payload);
        const nextState = updateCsrfState(normalizedPayload);

        if (!nextState.token) {
            throw new ApiError({
                timestamp: new Date().toISOString(),
                status: 500,
                error: "CSRF Bootstrap Error",
                message:
                    "No fue posible obtener el token CSRF desde /api/csrf.",
                path: CSRF_ENDPOINT_PATH,
            });
        }

        logCsrfBootstrap(nextState, forceRefresh);
        return nextState;
    })().finally(() => {
        csrfBootstrapPromise = null;
    });

    return csrfBootstrapPromise;
}

export async function waitForCsrfToken(): Promise<CsrfState> {
    if (csrfState.token) {
        return getCsrfStateSnapshot();
    }

    if (csrfBootstrapPromise) {
        return csrfBootstrapPromise;
    }

    throw new ApiError({
        timestamp: new Date().toISOString(),
        status: 500,
        error: "CSRF Initialization Error",
        message:
            "El token CSRF aun no esta inicializado. La aplicacion debe bootstrappear /api/csrf antes de enviar solicitudes mutantes.",
        path: CSRF_ENDPOINT_PATH,
    });
}

export async function refreshCsrfToken(): Promise<CsrfState> {
    if (!csrfRefreshPromise) {
        logCsrfRefresh();

        csrfRefreshPromise = ensureCsrfToken({ forceRefresh: true }).finally(() => {
            csrfRefreshPromise = null;
        });
    }

    return csrfRefreshPromise;
}
