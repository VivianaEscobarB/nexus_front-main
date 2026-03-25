import { appEnv } from "@/lib/config/env";

const CSRF_COOKIE_NAME = appEnv.csrfCookieName;
export const CSRF_HEADER_NAME = appEnv.csrfHeaderName;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function canReadDocumentCookies(): boolean {
    return typeof document !== "undefined";
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
    return readCookie(CSRF_COOKIE_NAME);
}
