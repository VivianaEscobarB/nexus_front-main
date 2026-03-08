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
import { tokenStorage } from "@/modules/auth/session/tokenStorage";
import { configureHttpClientAuth } from "@/shared/api/httpClient";
import { ApiError, isApiError } from "@/shared/api/apiError";
import type { AuthSession, LoginCredentials, Role, User } from "@/types";

let refreshPromise: Promise<AuthTokens> | null = null;

function normalizeRoleName(role: string): string {
    return role.startsWith("ROLE_") ? role.slice(5) : role;
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

function mapTokens(tokens: AuthTokens): AuthSession["tokens"] {
    return {
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken ?? "",
    };
}

function isUnauthorized(error: unknown): boolean {
    return isApiError(error) && error.status === 401;
}

async function loginWithApi(
    credentials: LoginCredentials
): Promise<AuthSession> {
    const tokens = await authApi.login(credentials);
    tokenStorage.setTokens(tokens);
    const user = await getCurrentUser();
    return {
        user,
        tokens: mapTokens(tokens),
    };
}

async function loginWithMock(
    credentials: LoginCredentials
): Promise<AuthSession> {
    const session = await authMock.login(credentials);

    tokenStorage.setTokens({
        token: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken || null,
    });

    return session;
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

    if (typeof response.token === "string") {
        tokenStorage.setTokens({
            token: response.token,
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

export async function refreshSession(): Promise<AuthTokens> {
    if (appEnv.authProvider !== "api") {
        const storedTokens = tokenStorage.getTokens();
        if (storedTokens?.token) {
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

    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
        throw new ApiError({
            timestamp: new Date().toISOString(),
            status: 401,
            error: "Unauthorized",
            message: "No hay refresh token disponible.",
            path: "/api/auth/refresh",
        });
    }

    refreshPromise = authApi
        .refresh({ refreshToken })
        .then((tokens) => {
            tokenStorage.setTokens(tokens);
            return tokens;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

export async function restoreSession(): Promise<User | null> {
    const storedTokens = tokenStorage.getTokens();

    if (!storedTokens?.token) {
        return null;
    }

    try {
        return await getCurrentUser();
    } catch (error) {
        if (appEnv.authProvider === "api" && isUnauthorized(error)) {
            try {
                await refreshSession();
                return await getCurrentUser();
            } catch {
                tokenStorage.clearTokens();
                return null;
            }
        }

        tokenStorage.clearTokens();
        return null;
    }
}

export async function logout(): Promise<void> {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    try {
        if (appEnv.authProvider === "api" && accessToken) {
            await authApi.logout(accessToken, { refreshToken });
        } else {
            await authMock.logout();
        }
    } finally {
        tokenStorage.clearTokens();
        authMock.clearMockSessionState();
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
    refreshAccessToken: async () => {
        await refreshSession();
    },
    onAuthFailure: () => {
        tokenStorage.clearTokens();
        authMock.clearMockSessionState();
    },
});
