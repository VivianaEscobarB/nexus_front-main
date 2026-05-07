import { isApiError } from "@/shared/api/apiError";

export type RFErrorKind = "permission" | "validation" | "network" | "server" | "unknown";

export type RFClientError = {
    kind: RFErrorKind;
    message: string;
};

export function normalizeRFError(error: unknown): RFClientError {
    if (isApiError(error)) {
        if (error.status === 401 || error.status === 403) {
            return {
                kind: "permission",
                message: "Tu usuario no tiene permisos para esta operación RF.",
            };
        }
        if (error.status >= 400 && error.status < 500) {
            return {
                kind: "validation",
                message: error.message || "Revisa los datos ingresados e intenta de nuevo.",
            };
        }
        return {
            kind: "server",
            message: error.message || "El servidor no pudo procesar la solicitud RF.",
        };
    }

    if (error instanceof DOMException || (error instanceof TypeError && /fetch/i.test(error.message))) {
        return {
            kind: "network",
            message: "No hay conexión con el servidor. Revisa red e intenta de nuevo.",
        };
    }

    if (error instanceof Error && error.message) {
        return { kind: "unknown", message: error.message };
    }

    return {
        kind: "unknown",
        message: "Error inesperado en operación RF.",
    };
}
