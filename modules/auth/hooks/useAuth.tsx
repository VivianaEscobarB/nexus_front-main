"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { appEnv } from "@/lib/config/env";
import {
    login,
    logout,
    restoreSession,
} from "@/modules/auth/services/auth.service";
import { authStore, useAuthStore } from "@/modules/auth/state/authStore";
import {
    AccountActivationRequiredError,
    normalizeLoginError,
} from "@/modules/auth/utils/loginError";
import type { LoginCredentials, User } from "@/types";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    initialized: boolean;
    signIn: (credentials: LoginCredentials) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<User | null>;
    isSigningIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function logAuthDebug(
    event: string,
    payload: Record<string, unknown> = {}
): void {
    if (!appEnv.isDevelopment) {
        return;
    }

    console.log(`[auth] ${event}`, payload);
}

function logAuthError(
    event: string,
    payload: Record<string, unknown> = {}
): void {
    if (!appEnv.isDevelopment) {
        return;
    }

    console.error(`[auth] ${event}`, payload);
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const state = useAuthStore();
    const initializedRef = useRef(false);
    const requestSequenceRef = useRef(0);

    const beginTrackedRequest = useCallback((event: string): number => {
        requestSequenceRef.current += 1;
        const requestId = requestSequenceRef.current;

        logAuthDebug(`${event}:start`, {
            requestId,
            pathname:
                typeof window !== "undefined" ? window.location.pathname : null,
        });

        return requestId;
    }, []);

    const isActiveRequest = useCallback((requestId: number): boolean => {
        return requestSequenceRef.current === requestId;
    }, []);

    useEffect(() => {
        logAuthDebug("state", {
            initialized: state.initialized,
            isAuthenticated: state.isAuthenticated,
            isLoading: state.isLoading,
            isSigningIn: state.isSigningIn,
            user: state.user
                ? {
                    email: state.user.email,
                    userId: state.user.user_id,
                }
                : null,
        });
    }, [
        state.initialized,
        state.isAuthenticated,
        state.isLoading,
        state.isSigningIn,
        state.user,
    ]);

    useEffect(() => {
        if (initializedRef.current) return;

        initializedRef.current = true;
        const requestId = beginTrackedRequest("restore");
        authStore.startRestore();

        restoreSession()
            .then((user) => {
                if (!isActiveRequest(requestId)) {
                    logAuthDebug("restore:ignored", { requestId });
                    return;
                }

                authStore.finishRestore(user);
                logAuthDebug("restore:resolved", {
                    requestId,
                    isAuthenticated: Boolean(user),
                    user: user
                        ? {
                            email: user.email,
                            userId: user.user_id,
                        }
                        : null,
                });
            })
            .catch((error) => {
                if (!isActiveRequest(requestId)) {
                    logAuthDebug("restore:error-ignored", { requestId });
                    return;
                }

                authStore.finishRestore(null);
                authStore.setError(getAuthErrorMessage(
                    error,
                    "No fue posible restaurar la sesion."
                ));
                logAuthError("restore:failed", { requestId, error });
            });
    }, [beginTrackedRequest, isActiveRequest]);

    const signIn = useCallback(
        async (credentials: LoginCredentials): Promise<void> => {
            const requestId = beginTrackedRequest("sign-in");
            authStore.startSignIn();

            try {
                const authenticatedUser = await login(credentials);

                if (!isActiveRequest(requestId)) {
                    logAuthDebug("sign-in:ignored-after-login", { requestId });
                    return;
                }

                let resolvedUser = authenticatedUser;

                try {
                    const restoredUser = await restoreSession();

                    if (!isActiveRequest(requestId)) {
                        logAuthDebug("sign-in:ignored-after-restore", { requestId });
                        return;
                    }

                    if (restoredUser) {
                        resolvedUser = restoredUser;
                    } else {
                        logAuthDebug("sign-in:restore-returned-null", {
                            requestId,
                            email: authenticatedUser.email,
                        });
                    }
                } catch (restoreError) {
                    if (!isActiveRequest(requestId)) {
                        logAuthDebug("sign-in:restore-error-ignored", { requestId });
                        return;
                    }

                    logAuthError("sign-in:restore-failed", {
                        requestId,
                        error: restoreError,
                    });
                }

                authStore.finishSignIn(resolvedUser);
                logAuthDebug("sign-in:state-synced", {
                    requestId,
                    user: {
                        email: resolvedUser.email,
                        userId: resolvedUser.user_id,
                    },
                });
                router.push("/dashboard");
            } catch (error) {
                if (!isActiveRequest(requestId)) {
                    logAuthDebug("sign-in:error-ignored", { requestId });
                    return;
                }

                const normalizedError = normalizeLoginError(
                    error,
                    "No fue posible iniciar sesion."
                );

                authStore.finishSignIn(null);
                authStore.setError(normalizedError.message);
                logAuthError("sign-in:failed", {
                    requestId,
                    error,
                    normalizedMessage: normalizedError.message,
                    requiresActivation:
                        normalizedError instanceof AccountActivationRequiredError,
                });
                throw normalizedError;
            }
        },
        [beginTrackedRequest, isActiveRequest, router]
    );

    const refreshSession = useCallback(async (): Promise<User | null> => {
        const requestId = beginTrackedRequest("refresh-session");
        authStore.startRestore();

        try {
            const restoredUser = await restoreSession();

            if (!isActiveRequest(requestId)) {
                logAuthDebug("refresh-session:ignored", { requestId });
                return authStore.getState().user;
            }

            authStore.finishRestore(restoredUser);
            logAuthDebug("refresh-session:resolved", {
                requestId,
                isAuthenticated: Boolean(restoredUser),
                user: restoredUser
                    ? {
                        email: restoredUser.email,
                        userId: restoredUser.user_id,
                    }
                    : null,
            });

            return restoredUser;
        } catch (error) {
            if (!isActiveRequest(requestId)) {
                logAuthDebug("refresh-session:error-ignored", { requestId });
                return authStore.getState().user;
            }

            authStore.finishRestore(null);
            authStore.setError(getAuthErrorMessage(
                error,
                "No fue posible sincronizar la sesion."
            ));
            logAuthError("refresh-session:failed", { requestId, error });
            throw error;
        }
    }, [beginTrackedRequest, isActiveRequest]);

    const signOut = useCallback(async (): Promise<void> => {
        const requestId = beginTrackedRequest("sign-out");
        authStore.startRestore();

        try {
            await logout();
        } finally {
            if (!isActiveRequest(requestId)) {
                logAuthDebug("sign-out:ignored", { requestId });
                return;
            }

            authStore.clearSession();
            logAuthDebug("sign-out:completed", { requestId });
        }
    }, [beginTrackedRequest, isActiveRequest]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user: state.user,
            isLoading: state.isLoading,
            isAuthenticated: state.isAuthenticated,
            initialized: state.initialized,
            signIn,
            signOut,
            refreshSession,
            isSigningIn: state.isSigningIn,
        }),
        [
            state.user,
            state.isLoading,
            state.isAuthenticated,
            state.initialized,
            state.isSigningIn,
            signIn,
            signOut,
            refreshSession,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe usarse dentro de un <AuthProvider>. " +
            "Envuelve tu app con <AuthProvider> en el layout raíz."
        );
    }

    return context;
}
