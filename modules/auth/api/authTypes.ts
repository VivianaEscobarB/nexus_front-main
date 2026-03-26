import type { AuthError } from "@/shared/api/apiError";

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    cityId: number;
};
export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { token: string; newPassword: string };

export type CurrentUser = {
    id: number;
    username: string;
    email: string;
    status: string;
    roles: string[];
};

export type RegisterResponse = {
    message?: string;
} & Record<string, unknown>;
export type PasswordActionResponse = {
    message?: string;
} & Record<string, unknown>;

export type { AuthError };
