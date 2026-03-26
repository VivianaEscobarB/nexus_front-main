import { appEnv } from "@/lib/config/env";
import { ApiError, buildApiError } from "@/shared/api/apiError";
import { CSRF_HEADER_NAME, getCsrfToken, isMutatingMethod } from "@/shared/api/csrf";

type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    body?: unknown;
    query?: Record<string, QueryValue>;
    auth?: boolean;
    retryOnUnauthorized?: boolean;
    signal?: AbortSignal;
}

interface HttpClientAuthHandlers {
    refreshSession: () => void | Promise<void>;
    onAuthFailure: () => void | Promise<void>;
    onForbidden: (error: ApiError) => void | Promise<void>;
}

let authHandlers: Partial<HttpClientAuthHandlers> = {};

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

async function request<T>(
    path: string,
    options: HttpRequestOptions = {},
    retried: boolean = false
): Promise<T> {
    const {
        method = "GET",
        headers,
        body,
        query,
        auth = true,
        retryOnUnauthorized = true,
        signal,
    } = options;

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

    if (isMutatingMethod(method) && !requestHeaders.has(CSRF_HEADER_NAME)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            requestHeaders.set(CSRF_HEADER_NAME, csrfToken);
        }
    }

    const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal,
        credentials: "include",
    });

    if (
        response.status === 401 &&
        auth &&
        retryOnUnauthorized &&
        !retried &&
        authHandlers.refreshSession
    ) {
        try {
            await authHandlers.refreshSession();
            return await request<T>(path, options, true);
        } catch (refreshError) {
            await authHandlers.onAuthFailure?.();

            if (refreshError instanceof Error) {
                throw refreshError;
            }

            throw new ApiError({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "La sesion expiro. Vuelve a iniciar sesion.",
                path,
            });
        }
    }

    const payload = await parsePayload<unknown>(response);

    if (!response.ok) {
        const baseApiError = buildApiError(payload, response.status, path);
        const apiError =
            response.status === 403
                ? enrichForbiddenError(baseApiError, method)
                : baseApiError;

        if (response.status === 401 && auth && retryOnUnauthorized) {
            await authHandlers.onAuthFailure?.();
        }

        if (response.status === 403) {
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
