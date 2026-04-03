import type {
    ActivateAccountRequest,
    ForgotPasswordRequest,
    RegisterRequest,
    ResendActivationRequest,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import {
    activateAccount as activateAccountRequest,
    forgotPassword as forgotPasswordRequest,
    getCurrentUser,
    login as loginSession,
    logout as logoutSession,
    resendActivation as resendActivationRequest,
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

export async function resendActivation(payload: ResendActivationRequest) {
    return resendActivationRequest(payload);
}

export async function resetPassword(payload: ResetPasswordRequest) {
    return resetPasswordRequest(payload);
}

export async function activateAccount(payload: ActivateAccountRequest) {
    return activateAccountRequest(payload);
}
