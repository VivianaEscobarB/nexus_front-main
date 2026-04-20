import { appEnv } from "@/lib/config/env";
import * as authApi from "@/modules/auth/api/authApi";
import type {
    ActivateAccountRequest,
    ActivateAccountResponse,
    CurrentUser,
    ForgotPasswordRequest,
    PasswordActionResponse,
    ResendActivationRequest,
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
const isMockAuthEnabled =
    appEnv.isDevelopment && appEnv.authProvider === "mock";
const CLIENT_AUTH_ROUTES = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/activate-account",
] as const;
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
    const rawClientId = user.clientId ?? user.client_id ?? null;
    return {
        user_id: String(user.id),
        first_name: user.username,
        last_name: "",
        email: user.email,
        status: normalizeStatus(user.status),
        roles: user.roles.map(mapRole),
        client_id: rawClientId != null ? String(rawClientId) : null,
    };
}

function isUnauthorized(error: unknown): boolean {
    return isApiError(error) && error.status === 401;
}

function clearLocalSession(): void {
    if (isMockAuthEnabled) {
        authMock.clearMockSessionState();
    }

    authStore.clearSession();
}

function isClientAuthRoute(pathname: string): boolean {
    if (pathname === "/") {
        return true;
    }

    return CLIENT_AUTH_ROUTES.some(
        (route) => route !== "/" && pathname.startsWith(route)
    );
}

function shouldRedirectToLogin(pathname: string): boolean {
    return !isClientAuthRoute(pathname);
}

function shouldRetryRestoreSessionOnUnauthorized(): boolean {
    if (typeof window === "undefined") {
        return true;
    }

    return !isClientAuthRoute(window.location.pathname);
}

function redirectToLogin(): void {
    if (typeof window === "undefined") return;

    if (!shouldRedirectToLogin(window.location.pathname)) {
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
    return isMockAuthEnabled ? loginWithMock(credentials) : loginWithApi(credentials);
}

export async function register(
    payload: RegisterRequest
): Promise<RegisterResponse> {
    if (isMockAuthEnabled) {
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
    if (isMockAuthEnabled) {
        return authMock.getMe();
    }

    const currentUser = await authApi.getCurrentUser({
        retryOnUnauthorized: options.retryOnUnauthorized,
    });
    return mapCurrentUserToUser(currentUser);
}

async function refreshSession(): Promise<void> {
    if (isMockAuthEnabled) {
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
    if (isMockAuthEnabled) {
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
        return await getCurrentUser({
            retryOnUnauthorized: shouldRetryRestoreSessionOnUnauthorized(),
        });
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
        if (revokeRemote && !isMockAuthEnabled) {
            await authApi.logout();
        } else if (isMockAuthEnabled) {
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
    if (isMockAuthEnabled) {
        return authMock.forgotPassword(payload);
    }

    return authApi.forgotPassword(payload);
}

export async function resendActivation(
    payload: ResendActivationRequest
): Promise<PasswordActionResponse> {
    if (isMockAuthEnabled) {
        return authMock.resendActivation(payload);
    }

    return authApi.resendActivation(payload);
}

export async function resetPassword(
    payload: ResetPasswordRequest
): Promise<PasswordActionResponse> {
    if (isMockAuthEnabled) {
        return authMock.resetPassword(payload);
    }

    return authApi.resetPassword(payload);
}

export async function activateAccount(
    payload: ActivateAccountRequest
): Promise<ActivateAccountResponse> {
    if (isMockAuthEnabled) {
        return authMock.activateAccount(payload);
    }

    return authApi.activateAccount(payload);
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
