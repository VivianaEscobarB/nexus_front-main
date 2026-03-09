import { httpClient } from "@/shared/api/httpClient";
import type {
    AuthResponse,
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

export function login(data: LoginRequest): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>("/api/auth/login", data, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

export function register(data: RegisterRequest): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>("/api/auth/register", data, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

export function refresh(data: RefreshTokenRequest): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>("/api/auth/refresh", data, {
        auth: false,
        retryOnUnauthorized: false,
    });
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
