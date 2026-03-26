import type {
    ForgotPasswordRequest,
    RegisterRequest,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import {
    forgotPassword as forgotPasswordRequest,
    getCurrentUser,
    login as loginSession,
    logout as logoutSession,
    register as registerUser,
    resetPassword as resetPasswordRequest,
    restoreSession as restoreSessionState,
} from "@/modules/auth/session/authSessionService";
import type { LoginCredentials, User } from "@/types";

export async function login(
    credentials: LoginCredentials
): Promise<User> {
    return loginSession(credentials);
}

export async function register(payload: RegisterRequest) {
    return registerUser(payload);
}

export async function logout(): Promise<void> {
    return logoutSession({ redirectToLogin: true });
}

export async function getMe(): Promise<User> {
    return getCurrentUser();
}

export async function restoreSession(): Promise<User | null> {
    return restoreSessionState();
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
    return forgotPasswordRequest(payload);
}

export async function resetPassword(payload: ResetPasswordRequest) {
    return resetPasswordRequest(payload);
}
