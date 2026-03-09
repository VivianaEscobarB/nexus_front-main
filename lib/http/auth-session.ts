import type { AuthTokens } from "@/types";

const ACCESS_TOKEN_KEY = "nexus_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "nexus_refresh_token";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24;

function canUseWindow(): boolean {
    return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
    if (!canUseWindow()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    if (!canUseWindow()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function hasAccessToken(): boolean {
    return Boolean(getAccessToken());
}

export function setAccessToken(token: string): void {
    if (!canUseWindow()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function persistTokens(tokens: AuthTokens): void {
    if (!canUseWindow()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.localStorage.setItem(
        REFRESH_TOKEN_STORAGE_KEY,
        tokens.refreshToken
    );
}

export function persistAccessTokenCookie(
    token: string,
    maxAge: number = DEFAULT_COOKIE_MAX_AGE
): void {
    if (!canUseWindow()) return;
    document.cookie = `${ACCESS_TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function persistSession(tokens: AuthTokens): void {
    persistTokens(tokens);
    persistAccessTokenCookie(tokens.accessToken);
}

export function clearSessionStorage(): void {
    if (!canUseWindow()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
}

export {
    ACCESS_TOKEN_KEY as TOKEN_KEY,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_STORAGE_KEY as REFRESH_TOKEN_KEY,
};
