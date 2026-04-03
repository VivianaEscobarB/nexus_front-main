import { httpClient } from "@/shared/api/httpClient";
import type {
    ActivateAccountRequest,
    ActivateAccountResponse,
    CurrentUser,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordActionResponse,
    ResendActivationRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";

export function login(data: LoginRequest): Promise<void> {
    return httpClient.post<void>("/api/auth/login", data, {
        auth: false,
        preserveForbiddenErrors: true,
        retryOnUnauthorized: false,
    });
}

export function register(data: RegisterRequest): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>("/api/auth/register", data, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

export function logout(): Promise<void> {
    return httpClient.post<void>("/api/auth/logout", undefined, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

export function refresh(): Promise<void> {
    return httpClient.post<void>("/api/auth/refresh", undefined, {
        auth: false,
        retryOnUnauthorized: false,
    });
}

interface CurrentUserRequestOptions {
    retryOnUnauthorized?: boolean;
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

export function resendActivation(
    data: ResendActivationRequest
): Promise<PasswordActionResponse> {
    return httpClient.post<PasswordActionResponse>(
        "/api/auth/resend-activation",
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

export function activateAccount(
    data: ActivateAccountRequest
): Promise<ActivateAccountResponse> {
    return httpClient.post<ActivateAccountResponse>(
        "/api/auth/activate-account",
        data,
        {
            auth: false,
            retryOnUnauthorized: false,
        }
    );
}

export function getCurrentUser(
    options: CurrentUserRequestOptions = {}
): Promise<CurrentUser> {
    return httpClient.get<CurrentUser>("/api/users/me", {
        retryOnUnauthorized: options.retryOnUnauthorized,
    });
}
