export type AuthError = {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isAuthErrorPayload(value: unknown): value is AuthError {
    return (
        isObject(value) &&
        typeof value.timestamp === "string" &&
        typeof value.status === "number" &&
        typeof value.error === "string" &&
        typeof value.message === "string" &&
        typeof value.path === "string"
    );
}

export class ApiError extends Error implements AuthError {
    timestamp: string;
    status: number;
    error: string;
    path: string;

    constructor(payload: AuthError) {
        super(payload.message);
        this.name = "ApiError";
        this.timestamp = payload.timestamp;
        this.status = payload.status;
        this.error = payload.error;
        this.path = payload.path;
    }
}

/**
 * Une mensajes de validación típicos (Spring / Nest / mapas de campo) en un solo texto para la UI.
 */
export function extractRichApiErrorMessage(payload: unknown): string | null {
    if (!isObject(payload)) {
        return null;
    }

    const parts: string[] = [];

    const errors = payload.errors;
    if (Array.isArray(errors)) {
        for (const item of errors) {
            if (!isObject(item)) {
                continue;
            }
            const field =
                item.field ?? item.property ?? item.name ?? item.fieldName;
            const msg =
                item.defaultMessage ?? item.message ?? item.msg ?? item.detail;
            if (typeof msg === "string" && msg.trim()) {
                parts.push(
                    typeof field === "string" && field.trim()
                        ? `${field}: ${msg.trim()}`
                        : msg.trim()
                );
            }
        }
    } else if (isObject(errors)) {
        for (const [key, value] of Object.entries(errors)) {
            if (Array.isArray(value)) {
                const joined = value
                    .filter((v): v is string => typeof v === "string")
                    .join(", ");
                if (joined) {
                    parts.push(`${key}: ${joined}`);
                }
            } else if (typeof value === "string" && value.trim()) {
                parts.push(`${key}: ${value.trim()}`);
            }
        }
    }

    if (parts.length > 0) {
        return parts.join(" ");
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim();
    }

    if (typeof payload.detail === "string" && payload.detail.trim()) {
        return payload.detail.trim();
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error.trim();
    }

    return null;
}

const UNAUTHORIZED_DEFAULT_MESSAGE =
    "Sesión expirada o no enviada al API (cookie de acceso). Vuelva a iniciar sesión.";

export function buildApiError(
    payload: unknown,
    status: number,
    path: string
): ApiError {
    if (isAuthErrorPayload(payload)) {
        const base = new ApiError(payload);
        if (status === 401 && !payload.message?.trim()) {
            return new ApiError({ ...payload, message: UNAUTHORIZED_DEFAULT_MESSAGE });
        }
        return base;
    }

    const rich = extractRichApiErrorMessage(payload);

    return new ApiError({
        timestamp: new Date().toISOString(),
        status,
        error: status >= 500 ? "Server Error" : "Request Error",
        message:
            status === 401
                ? (rich ?? UNAUTHORIZED_DEFAULT_MESSAGE)
                : (rich ?? "No fue posible completar la solicitud."),
        path,
    });
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
