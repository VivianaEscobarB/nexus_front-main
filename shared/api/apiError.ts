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

export function buildApiError(
    payload: unknown,
    status: number,
    path: string
): ApiError {
    if (isAuthErrorPayload(payload)) {
        return new ApiError(payload);
    }

    return new ApiError({
        timestamp: new Date().toISOString(),
        status,
        error: status >= 500 ? "Server Error" : "Request Error",
        message:
            isObject(payload) && typeof payload.message === "string"
                ? payload.message
                : "No fue posible completar la solicitud.",
        path,
    });
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
