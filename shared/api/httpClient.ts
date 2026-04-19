import { appEnv } from "@/lib/config/env";
import { ApiError, buildApiError } from "@/shared/api/apiError";
import {
    ensureCsrfToken,
    refreshCsrfToken,
    isMutatingMethod,
    waitForCsrfToken,
} from "@/shared/api/csrf";

type QueryValue = string | number | boolean | null | undefined;

/**
 * El API emite JWT en cookies. Entre orígenes distintos (p. ej. localhost:3000 → :8080)
 * el valor por defecto de fetch (`credentials: "same-origin"`) no envía cookies;
 * `include` es obligatorio para que JwtAuthenticationFilter reciba el token.
 */
const API_CROSS_ORIGIN_FETCH_DEFAULTS = {
    credentials: "include" as RequestCredentials,
    mode: "cors" as RequestMode,
};

export interface HttpRequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    body?: unknown;
    query?: Record<string, QueryValue>;
    auth?: boolean;
    retryOnUnauthorized?: boolean;
    preserveForbiddenErrors?: boolean;
    signal?: AbortSignal;
}

interface HttpClientAuthHandlers {
    refreshSession: () => void | Promise<void>;
    onAuthFailure: () => void | Promise<void>;
    onForbidden: (error: ApiError) => void | Promise<void>;
}

let authHandlers: Partial<HttpClientAuthHandlers> = {};

interface InternalRequestOptions {
    authRetried?: boolean;
    csrfRetried?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(path, appEnv.apiBaseUrl);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            url.searchParams.set(key, String(value));
        });
    }

    return url.toString();
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

function enrichForbiddenError(error: ApiError, method: string): ApiError {
    if (!isMutatingMethod(method)) {
        return error;
    }

    if (/csrf|xsrf/i.test(error.message)) {
        return error;
    }

    return new ApiError({
        timestamp: error.timestamp,
        status: error.status,
        error: error.error,
        path: error.path,
        message:
            "La solicitud fue rechazada por seguridad (CSRF). " +
            "Recarga la pagina e intenta nuevamente. Si el problema continua, inicia sesion de nuevo.",
    });
}

function shouldRetryCsrfRequest(
    method: string,
    status: number,
    csrfRetried: boolean,
    preserveForbiddenErrors: boolean
): boolean {
    return (
        status === 403 &&
        isMutatingMethod(method) &&
        !csrfRetried &&
        !preserveForbiddenErrors
    );
}

function logCsrfRetry(method: string, path: string): void {
    if (!appEnv.isDevelopment) {
        return;
    }

    console.info("[csrf] retrying request after 403", {
        method,
        path,
    });
}

async function waitForCookieSynchronization(): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

async function resolveCsrfState() {
    try {
        const csrfState = await waitForCsrfToken();

        if (csrfState.token) {
            return csrfState;
        }
    } catch {
        // Fall through to bootstrap from /api/csrf when the token has not been initialized yet.
    }

    const nextState = await ensureCsrfToken();
    if (nextState.token) {
        return nextState;
    }

    return ensureCsrfToken({ forceRefresh: true });
}

async function request<T>(
    path: string,
    options: HttpRequestOptions = {},
    internal: InternalRequestOptions = {}
): Promise<T> {
    const {
        method = "GET",
        headers,
        body,
        query,
        auth = true,
        retryOnUnauthorized = true,
        preserveForbiddenErrors = false,
        signal,
    } = options;
    const { authRetried = false, csrfRetried = false } = internal;

    const url = buildUrl(path, query);
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");

    let requestBody: BodyInit | undefined;

    if (body !== undefined && body !== null) {
        if (body instanceof FormData) {
            requestBody = body;
        } else {
            requestHeaders.set("Content-Type", "application/json");
            requestBody = JSON.stringify(body);
        }
    }

    if (isMutatingMethod(method)) {
        const csrfState = await resolveCsrfState();
        const csrfHeaderName = csrfState.headerName;
        const csrfToken = csrfState.token;

        if (!csrfHeaderName || !csrfToken) {
            throw new ApiError({
                timestamp: new Date().toISOString(),
                status: 500,
                error: "CSRF Bootstrap Error",
                message:
                    "No fue posible preparar el token CSRF para la solicitud.",
                path,
            });
        }

        if (!requestHeaders.has(csrfHeaderName)) {
            requestHeaders.set(csrfHeaderName, csrfToken);
        }
    }

    const response = await fetch(url, {
        ...API_CROSS_ORIGIN_FETCH_DEFAULTS,
        method,
        headers: requestHeaders,
        body: requestBody,
        signal,
    });

    if (
        response.status === 401 &&
        auth &&
        retryOnUnauthorized &&
        !authRetried &&
        authHandlers.refreshSession
    ) {
        try {
            await authHandlers.refreshSession();
            await waitForCookieSynchronization();
            return await request<T>(path, options, {
                ...internal,
                authRetried: true,
            });
        } catch (refreshError) {
            await authHandlers.onAuthFailure?.();

            if (refreshError instanceof Error) {
                throw refreshError;
            }

            throw new ApiError({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message:
                    "Sesión expirada o no enviada al API. Vuelva a iniciar sesión (si reinició el backend, el token anterior deja de ser válido).",
                path,
            });
        }
    }

    const payload = await parsePayload<unknown>(response);

    if (
        shouldRetryCsrfRequest(
            method,
            response.status,
            csrfRetried,
            preserveForbiddenErrors
        )
    ) {
        logCsrfRetry(method, path);
        await refreshCsrfToken();
        await waitForCookieSynchronization();
        return request<T>(path, options, {
            ...internal,
            csrfRetried: true,
        });
    }

    if (!response.ok) {
        const baseApiError = buildApiError(payload, response.status, path);
        const apiError =
            response.status === 403 && !preserveForbiddenErrors
                ? enrichForbiddenError(baseApiError, method)
                : baseApiError;

        if (response.status === 401 && auth && retryOnUnauthorized) {
            await authHandlers.onAuthFailure?.();
        }

        if (response.status === 403 && !preserveForbiddenErrors) {
            await authHandlers.onForbidden?.(apiError);
        }

        throw apiError;
    }

    return payload as T;
}

export function configureHttpClientAuth(
    handlers: Partial<HttpClientAuthHandlers>
): void {
    authHandlers = { ...authHandlers, ...handlers };
}

export const httpClient = {
    request,
    get<T>(path: string, options: Omit<HttpRequestOptions, "method"> = {}) {
        return request<T>(path, { ...options, method: "GET" });
    },
    post<T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) {
        return request<T>(path, { ...options, method: "POST", body });
    },
    put<T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) {
        return request<T>(path, { ...options, method: "PUT", body });
    },
    patch<T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) {
        return request<T>(path, { ...options, method: "PATCH", body });
    },
    delete<T>(path: string, options: Omit<HttpRequestOptions, "method"> = {}) {
        return request<T>(path, { ...options, method: "DELETE" });
    },
};
