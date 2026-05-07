import type { AuthError } from "@/shared/api/apiError";

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    cityId: number;
};
export type ForgotPasswordRequest = { email: string };
export type ResendActivationRequest = { email: string };
export type ResetPasswordRequest = {
    email: string;
    code: string;
    newPassword: string;
};
export type ActivateAccountRequest = {
    token: string;
    password: string;
};

export type CurrentUser = {
    id: number;
    username: string;
    email: string;
    status: string;
    roles: string[];
    clientId?: number | string | null;
    client_id?: number | string | null;
    cityId?: number | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type PatchCurrentUserRequest = {
    username?: string;
    email?: string;
    cityId?: number | null;
    avatarUrl?: string;
};

export type RegisterResponse = {
    message?: string;
} & Record<string, unknown>;
export type PasswordActionResponse = {
    message?: string;
} & Record<string, unknown>;
export type ActivateAccountResponse = {
    message?: string;
} & Record<string, unknown>;

export type { AuthError };
