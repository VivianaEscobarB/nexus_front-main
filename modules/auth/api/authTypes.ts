import type { AuthError } from "@/shared/api/apiError";

export type AuthTokens = { accessToken: string; refreshToken: string | null };

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    cityId: number;
};
export type RefreshTokenRequest = { refreshToken: string };
export type LogoutRequest = { refreshToken: string | null };
export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { token: string; newPassword: string };

export type CurrentUser = {
    id: number;
    username: string;
    email: string;
    status: string;
    roles: string[];
};

export type AuthResponse = {
    accessToken?: string | null;
    token?: string | null;
    refreshToken?: string | null;
} & Record<string, unknown>;
export type RegisterResponse = {
    accessToken?: string | null;
    token?: string | null;
    refreshToken?: string | null;
    message?: string;
} & Record<string, unknown>;
export type PasswordActionResponse = {
    message?: string;
} & Record<string, unknown>;

export type { AuthError };
