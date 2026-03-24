import { httpClient } from "@/shared/api/httpClient";
import type {
    AuthResponse,
    AuthTokens,
    CurrentUser,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    PasswordActionResponse,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";

function normalizeAuthTokens(payload: AuthResponse): AuthTokens {
    const accessToken =
        typeof payload.accessToken === "string" && payload.accessToken.trim().length > 0
            ? payload.accessToken
            : typeof payload.token === "string" && payload.token.trim().length > 0
                ? payload.token
                : null;

    if (!accessToken) {
        throw new Error("Respuesta de autenticacion invalida: falta accessToken/token.");
    }

    return {
        accessToken,
        refreshToken:
            typeof payload.refreshToken === "string" && payload.refreshToken.trim().length > 0
                ? payload.refreshToken
                : null,
    };
}

export async function login(data: LoginRequest): Promise<AuthTokens> {
    const payload = await httpClient.post<AuthResponse>("/api/auth/login", data, {
        auth: false,
        retryOnUnauthorized: false,
    });

    return normalizeAuthTokens(payload);
}

export function register(data: RegisterRequest): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>("/api/auth/register", data, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

export async function refresh(
    data?: Partial<RefreshTokenRequest>
): Promise<AuthTokens> {
    const payload = await httpClient.post<AuthResponse>("/api/auth/refresh", data ?? {}, {
        auth: false,
        retryOnUnauthorized: false,
    });

    return normalizeAuthTokens(payload);
}

export function logout(
    accessToken: string,
    data: LogoutRequest
): Promise<void> {
    return httpClient.post<void>("/api/auth/logout", data, {
        auth: false,
        retryOnUnauthorized: false,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
}

export function forgotPassword(
    data: ForgotPasswordRequest
): Promise<PasswordActionResponse> {
    return httpClient.post<PasswordActionResponse>(
        "/api/auth/password/forgot",
        data,
        {
            auth: false,
            retryOnUnauthorized: false,
        }
    );
}

export function resetPassword(
    data: ResetPasswordRequest
): Promise<PasswordActionResponse> {
    return httpClient.post<PasswordActionResponse>(
        "/api/auth/password/reset",
        data,
        {
            auth: false,
            retryOnUnauthorized: false,
        }
    );
}

export function getCurrentUser(): Promise<CurrentUser> {
    return httpClient.get<CurrentUser>("/api/users/me");
}
