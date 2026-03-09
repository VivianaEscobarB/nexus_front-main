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
import {
    login,
    logout,
    restoreSession,
} from "@/modules/auth/services/auth.service";
import { authStore, useAuthStore } from "@/modules/auth/state/authStore";
import type { LoginCredentials, User } from "@/types";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (credentials: LoginCredentials) => Promise<void>;
    signOut: () => Promise<void>;
    isSigningIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const state = useAuthStore();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;

        initializedRef.current = true;
        authStore.startRestore();

        restoreSession()
            .then((user) => {
                authStore.finishRestore(user);
            })
            .catch((error) => {
                authStore.finishRestore(null);
                authStore.setError(
                    error instanceof Error
                        ? error.message
                        : "No fue posible restaurar la sesion."
                );
            });
    }, []);

    const signIn = useCallback(
        async (credentials: LoginCredentials): Promise<void> => {
            authStore.startSignIn();

            try {
                const session = await login(credentials);
                authStore.finishSignIn(session.user);
                router.push("/dashboard");
            } catch (error) {
                authStore.finishSignIn(null);
                authStore.setError(
                    error instanceof Error
                        ? error.message
                        : "No fue posible iniciar sesion."
                );
                throw error;
            }
        },
        [router]
    );

    const signOut = useCallback(async (): Promise<void> => {
        authStore.startRestore();

        try {
            await logout();
        } finally {
            authStore.clearSession();
        }
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user: state.user,
            isLoading: state.isLoading,
            isAuthenticated: state.isAuthenticated,
            signIn,
            signOut,
            isSigningIn: state.isSigningIn,
        }),
        [
            state.user,
            state.isLoading,
            state.isAuthenticated,
            state.isSigningIn,
            signIn,
            signOut,
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
