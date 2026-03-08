import type { AuthTokens } from "@/modules/auth/api/authTypes";

const TOKEN_BUNDLE_KEY = "nexus_auth_tokens";
const ACCESS_TOKEN_KEY = "nexus_access_token";
const REFRESH_TOKEN_KEY = "nexus_refresh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function canUseStorage(): boolean {
    return typeof window !== "undefined";
}

function updateAccessTokenCookie(token: string | null): void {
    if (!canUseStorage()) return;

    if (!token) {
        document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
        return;
    }

    document.cookie = `${ACCESS_TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function normalizeTokens(value: unknown): AuthTokens | null {
    if (!value || typeof value !== "object") return null;

    const candidate = value as Partial<AuthTokens>;
    if (!candidate.token || typeof candidate.token !== "string") {
        return null;
    }

    return {
        token: candidate.token,
        refreshToken:
            typeof candidate.refreshToken === "string"
                ? candidate.refreshToken
                : null,
    };
}

export interface TokenStorage {
    getTokens: () => AuthTokens | null;
    setTokens: (tokens: AuthTokens) => void;
    clearTokens: () => void;
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
}

export const localTokenStorage: TokenStorage = {
    getTokens() {
        if (!canUseStorage()) return null;

        const bundled = window.localStorage.getItem(TOKEN_BUNDLE_KEY);
        if (bundled) {
            try {
                const parsed = JSON.parse(bundled);
                const normalized = normalizeTokens(parsed);
                if (normalized) {
                    return normalized;
                }
            } catch {
                window.localStorage.removeItem(TOKEN_BUNDLE_KEY);
            }
        }

        const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!token) return null;

        return {
            token,
            refreshToken: refreshToken ?? null,
        };
    },

    setTokens(tokens) {
        if (!canUseStorage()) return;

        window.localStorage.setItem(TOKEN_BUNDLE_KEY, JSON.stringify(tokens));
        window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.token);

        if (tokens.refreshToken) {
            window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        } else {
            window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        }

        updateAccessTokenCookie(tokens.token);
    },

    clearTokens() {
        if (!canUseStorage()) return;

        window.localStorage.removeItem(TOKEN_BUNDLE_KEY);
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        updateAccessTokenCookie(null);
    },

    getAccessToken() {
        return this.getTokens()?.token ?? null;
    },

    getRefreshToken() {
        return this.getTokens()?.refreshToken ?? null;
    },
};

export const tokenStorage = localTokenStorage;

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_BUNDLE_KEY };
