import { appEnv } from "@/lib/config/env";
import * as authApi from "@/modules/auth/api/authApi";
import type {
    AuthTokens,
    CurrentUser,
    ForgotPasswordRequest,
    PasswordActionResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import * as authMock from "@/modules/auth/mocks/auth.mock";
import { authStore } from "@/modules/auth/state/authStore";
import { tokenStorage } from "@/modules/auth/session/tokenStorage";
import { configureHttpClientAuth } from "@/shared/api/httpClient";
import { ApiError, isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";
import type { AuthSession, LoginCredentials, Role, User } from "@/types";

let refreshPromise: Promise<AuthTokens> | null = null;
const VALID_USER_ROLES = new Set<string>(Object.values(UserRole));
const ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS = 30;

function normalizeRoleName(role: string): string {
    const normalizedRole = role.startsWith("ROLE_") ? role.slice(5) : role;

    if (normalizedRole === "MANAGER") {
        return UserRole.ADMIN;
    }

    if (VALID_USER_ROLES.has(normalizedRole)) {
        return normalizedRole;
    }

    return normalizedRole;
}

function normalizeStatus(status: string): User["status"] {
    if (status === "ACTIVE" || status === "INACTIVE" || status === "SUSPENDED") {
        return status;
    }

    return "ACTIVE";
}

function mapRole(role: string, index: number): Role {
    const normalizedRole = normalizeRoleName(role);
    return {
        role_id: `role_${index}_${normalizedRole.toLowerCase()}`,
        role_name: normalizedRole,
        role_description: null,
    };
}

function mapCurrentUserToLegacyUser(user: CurrentUser): User {
    return {
        user_id: String(user.id),
        first_name: user.username,
        last_name: "",
        email: user.email,
        status: normalizeStatus(user.status),
        roles: user.roles.map(mapRole),
    };
}

function buildAuthSession(user: User, tokens: AuthTokens): AuthSession {
    const normalizedRefreshToken = tokens.refreshToken ?? "";

    return {
        userId: user.user_id,
        username: [user.first_name, user.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || user.email,
        roles: user.roles.map((role) => role.role_name),
        permissions: [],
        token: tokens.accessToken,
        refreshToken: normalizedRefreshToken,
        user,
        tokens: {
            accessToken: tokens.accessToken,
            refreshToken: normalizedRefreshToken,
        },
    };
}

function isUnauthorized(error: unknown): boolean {
    return isApiError(error) && error.status === 401;
}

function clearLocalSession(): void {
    tokenStorage.clearTokens();
    authMock.clearMockSessionState();
    authStore.clearSession();
}

function redirectToLogin(): void {
    if (typeof window === "undefined") return;

    if (window.location.pathname === "/login") {
        return;
    }

    window.location.replace("/login");
}

function decodeBase64Url(value: string): string | null {
    if (typeof window === "undefined") return null;

    try {
        const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(
            normalized.length + ((4 - (normalized.length % 4)) % 4),
            "="
        );

        return window.atob(padded);
    } catch {
        return null;
    }
}

function parseTokenExpiration(token: string): number | null {
    const parts = token.split(".");

    if (parts.length < 2) {
        return null;
    }

    const payload = decodeBase64Url(parts[1]);
    if (!payload) {
        return null;
    }

    try {
        const parsed = JSON.parse(payload) as { exp?: number };
        return typeof parsed.exp === "number" ? parsed.exp : null;
    } catch {
        return null;
    }
}

function isAccessTokenExpired(token: string): boolean {
    const expiration = parseTokenExpiration(token);

    if (!expiration) {
        return false;
    }

    const currentUnixTime = Math.floor(Date.now() / 1000);
    return expiration <= currentUnixTime + ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS;
}

async function loginWithApi(
    credentials: LoginCredentials
): Promise<AuthSession> {
    const tokens = await authApi.login(credentials);
    tokenStorage.setTokens(tokens);
    const user = await getCurrentUser();
    return buildAuthSession(user, tokens);
}

async function loginWithMock(
    credentials: LoginCredentials
): Promise<AuthSession> {
    const session = await authMock.login(credentials);
    const tokens: AuthTokens = {
        accessToken: session.token,
        refreshToken: session.refreshToken || null,
    };

    tokenStorage.setTokens(tokens);

    return buildAuthSession(session.user, tokens);
}

export async function login(
    credentials: LoginCredentials
): Promise<AuthSession> {
    return appEnv.authProvider === "api"
        ? loginWithApi(credentials)
        : loginWithMock(credentials);
}

export async function register(
    payload: RegisterRequest
): Promise<RegisterResponse> {
    if (appEnv.authProvider !== "api") {
        return authMock.register(payload);
    }

    const response = await authApi.register(payload);

    const registerAccessToken =
        typeof response.accessToken === "string" && response.accessToken.trim().length > 0
            ? response.accessToken
            : typeof response.token === "string" && response.token.trim().length > 0
                ? response.token
                : null;

    if (registerAccessToken) {
        tokenStorage.setTokens({
            accessToken: registerAccessToken,
            refreshToken:
                typeof response.refreshToken === "string"
                    ? response.refreshToken
                    : null,
        });
    }

    return response;
}

export async function getCurrentUser(): Promise<User> {
    if (appEnv.authProvider !== "api") {
        return authMock.getMe();
    }

    const currentUser = await authApi.getCurrentUser();
    return mapCurrentUserToLegacyUser(currentUser);
}

export async function refreshToken(
    overrideRefreshToken?: string | null
): Promise<AuthTokens> {
    if (appEnv.authProvider !== "api") {
        const storedTokens = tokenStorage.getTokens();
        if (storedTokens?.accessToken) {
            return storedTokens;
        }

        throw new ApiError({
            timestamp: new Date().toISOString(),
            status: 401,
            error: "Unauthorized",
            message: "No hay una sesion valida para refrescar.",
            path: "/mock/auth/refresh",
        });
    }

    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshTokenValue = overrideRefreshToken ?? tokenStorage.getRefreshToken();

    refreshPromise = authApi
        .refresh(
            refreshTokenValue
                ? { refreshToken: refreshTokenValue }
                : undefined
        )
        .then((tokens) => {
            tokenStorage.setTokens(tokens);
            return tokens;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

export async function refreshSession(): Promise<AuthTokens> {
    return refreshToken();
}

export async function restoreSession(): Promise<AuthSession | null> {
    const storedTokens = tokenStorage.getTokens();

    if (!storedTokens?.accessToken) {
        return null;
    }

    try {
        const user = await getCurrentUser();
        return buildAuthSession(user, storedTokens);
    } catch (error) {
        if (appEnv.authProvider === "api" && isUnauthorized(error)) {
            try {
                const refreshedTokens = await refreshToken();
                const user = await getCurrentUser();
                return buildAuthSession(user, refreshedTokens);
            } catch {
                clearLocalSession();
                return null;
            }
        }

        clearLocalSession();
        return null;
    }
}

interface LogoutOptions {
    redirectToLogin?: boolean;
    revokeRemote?: boolean;
}

export async function logout(options: LogoutOptions = {}): Promise<void> {
    const { redirectToLogin: shouldRedirectToLogin = false, revokeRemote = true } = options;
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    try {
        if (revokeRemote && appEnv.authProvider === "api" && accessToken) {
            await authApi.logout(accessToken, { refreshToken });
        } else if (appEnv.authProvider !== "api") {
            await authMock.logout();
        }
    } finally {
        clearLocalSession();

        if (shouldRedirectToLogin) {
            redirectToLogin();
        }
    }
}

export async function forgotPassword(
    payload: ForgotPasswordRequest
): Promise<PasswordActionResponse> {
    if (appEnv.authProvider !== "api") {
        return authMock.forgotPassword(payload);
    }

    return authApi.forgotPassword(payload);
}

export async function resetPassword(
    payload: ResetPasswordRequest
): Promise<PasswordActionResponse> {
    if (appEnv.authProvider !== "api") {
        return authMock.resetPassword(payload);
    }

    return authApi.resetPassword(payload);
}

configureHttpClientAuth({
    getAccessToken: () => tokenStorage.getAccessToken(),
    isAccessTokenExpired,
    refreshAccessToken: async () => {
        await refreshToken();
    },
    onAuthFailure: async () => {
        await logout({
            redirectToLogin: true,
            revokeRemote: false,
        });
    },
    onForbidden: (error) => {
        authStore.setError(
            error.message || "Acceso denegado. No tienes permisos para realizar esta accion."
        );
    },
});
