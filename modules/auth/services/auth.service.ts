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
    refreshToken as refreshSessionToken,
    refreshSession,
    register as registerUser,
    resetPassword as resetPasswordRequest,
    restoreSession as restoreSessionState,
} from "@/modules/auth/session/authSessionService";
import type { AuthSession, LoginCredentials, User } from "@/types";

export async function login(
    credentials: LoginCredentials
): Promise<AuthSession> {
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
    const session = await restoreSessionState();
    return session?.user ?? null;
}

export async function restoreAuthSession(): Promise<User | null> {
    return restoreSession();
}

export async function refreshTokens(refreshToken?: string | null) {
    return refreshSessionToken(refreshToken);
}

export async function refreshCurrentSession() {
    return refreshSession();
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
    return forgotPasswordRequest(payload);
}

export async function resetPassword(payload: ResetPasswordRequest) {
    return resetPasswordRequest(payload);
}
