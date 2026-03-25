import { appEnv } from "@/lib/config/env";
import * as authApi from "@/modules/auth/api/authApi";
import type {
    CurrentUser,
    ForgotPasswordRequest,
    PasswordActionResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import * as authMock from "@/modules/auth/mocks/auth.mock";
import { authStore } from "@/modules/auth/state/authStore";
import { configureHttpClientAuth } from "@/shared/api/httpClient";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";
import type { LoginCredentials, Role, User } from "@/types";

const VALID_USER_ROLES = new Set<string>(Object.values(UserRole));
let refreshPromise: Promise<void> | null = null;

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

function mapCurrentUserToUser(user: CurrentUser): User {
    return {
        user_id: String(user.id),
        first_name: user.username,
        last_name: "",
        email: user.email,
        status: normalizeStatus(user.status),
        roles: user.roles.map(mapRole),
    };
}

function isUnauthorized(error: unknown): boolean {
    return isApiError(error) && error.status === 401;
}

function clearLocalSession(): void {
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

async function loginWithApi(
    credentials: LoginCredentials
): Promise<User> {
    await authApi.login(credentials);
    return getCurrentUser({ retryOnUnauthorized: false });
}

async function loginWithMock(
    credentials: LoginCredentials
): Promise<User> {
    return authMock.login(credentials);
}

export async function login(
    credentials: LoginCredentials
): Promise<User> {
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

    return authApi.register(payload);
}

interface GetCurrentUserOptions {
    retryOnUnauthorized?: boolean;
}

export async function getCurrentUser(
    options: GetCurrentUserOptions = {}
): Promise<User> {
    if (appEnv.authProvider !== "api") {
        return authMock.getMe();
    }

    const currentUser = await authApi.getCurrentUser({
        retryOnUnauthorized: options.retryOnUnauthorized,
    });
    return mapCurrentUserToUser(currentUser);
}

async function refreshSession(): Promise<void> {
    if (appEnv.authProvider !== "api") {
        return;
    }

    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = authApi.refresh().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export async function restoreSession(): Promise<User | null> {
    if (appEnv.authProvider !== "api") {
        if (!authMock.hasMockSessionState()) {
            return null;
        }

        try {
            return await getCurrentUser();
        } catch {
            clearLocalSession();
            return null;
        }
    }

    try {
        return await getCurrentUser();
    } catch (error) {
        if (isUnauthorized(error)) {
            clearLocalSession();
            return null;
        }

        throw error;
    }
}

interface LogoutOptions {
    redirectToLogin?: boolean;
    revokeRemote?: boolean;
}

export async function logout(options: LogoutOptions = {}): Promise<void> {
    const { redirectToLogin: shouldRedirectToLogin = false, revokeRemote = true } = options;

    try {
        if (revokeRemote && appEnv.authProvider === "api") {
            await authApi.logout();
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
    refreshSession: async () => {
        await refreshSession();
    },
    onAuthFailure: async () => {
        await logout({
            redirectToLogin: true,
            revokeRemote: false,
        });
    },
    onForbidden: (error) => {
        authStore.setError(
            error.message ||
                "La solicitud fue rechazada por seguridad. Recarga la pagina e intenta nuevamente."
        );
    },
});
