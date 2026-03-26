import { appEnv } from "@/lib/config/env";
import { ApiError, buildApiError } from "@/shared/api/apiError";

const CSRF_COOKIE_NAME = appEnv.csrfCookieName;
const DEFAULT_CSRF_HEADER_NAME = appEnv.csrfHeaderName;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_ENDPOINT_PATH = "/api/csrf";

interface CsrfBootstrapResponse {
    headerName?: string;
    parameterName?: string;
    token?: string;
}

interface CsrfState {
    token: string | null;
    headerName: string;
    parameterName: string | null;
}

const csrfState: CsrfState = {
    token: null,
    headerName: DEFAULT_CSRF_HEADER_NAME,
    parameterName: null,
};

let csrfBootstrapPromise: Promise<CsrfState> | null = null;

function canReadDocumentCookies(): boolean {
    return typeof document !== "undefined";
}

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
        parameterName: getString(payload.parameterName) ?? undefined,
        token: getString(payload.token) ?? undefined,
    };
}

function updateCsrfState(payload: CsrfBootstrapResponse): CsrfState {
    const cookieToken = readCookie(CSRF_COOKIE_NAME);
    const nextToken = payload.token ?? cookieToken ?? null;

    csrfState.token = nextToken;
    csrfState.headerName = payload.headerName ?? DEFAULT_CSRF_HEADER_NAME;
    csrfState.parameterName = payload.parameterName ?? null;

    return {
        token: csrfState.token,
        headerName: csrfState.headerName,
        parameterName: csrfState.parameterName,
    };
}

export function isMutatingMethod(method: string): boolean {
    return MUTATING_METHODS.has(method.toUpperCase());
}

export function readCookie(name: string): string | null {
    if (!canReadDocumentCookies() || !document.cookie) {
        return null;
    }

    const encodedName = `${encodeURIComponent(name)}=`;
    const cookies = document.cookie.split(";");

    for (const rawCookie of cookies) {
        const cookie = rawCookie.trim();

        if (!cookie.startsWith(encodedName)) {
            continue;
        }

        const value = cookie.slice(encodedName.length);
        return value.length > 0 ? decodeURIComponent(value) : null;
    }

    return null;
}

export function getCsrfToken(): string | null {
    return csrfState.token ?? readCookie(CSRF_COOKIE_NAME);
}

export function getCsrfHeaderName(): string {
    return csrfState.headerName || DEFAULT_CSRF_HEADER_NAME;
}

export function clearCsrfToken(): void {
    csrfState.token = null;
    csrfState.headerName = DEFAULT_CSRF_HEADER_NAME;
    csrfState.parameterName = null;
}

export async function bootstrapCsrfToken(
    forceRefresh: boolean = false
): Promise<CsrfState> {
    if (!forceRefresh && csrfState.token) {
        return {
            token: csrfState.token,
            headerName: csrfState.headerName,
            parameterName: csrfState.parameterName,
        };
    }

    if (csrfBootstrapPromise) {
        return csrfBootstrapPromise;
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

        return nextState;
    })().finally(() => {
        csrfBootstrapPromise = null;
    });

    return csrfBootstrapPromise;
}
