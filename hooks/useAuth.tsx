"use client";

import {
    createContext,
    useContext,
    useCallback,
    useMemo,
    type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login, logout, getMe } from "@/services/auth.service";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/axios";
import type { User, LoginCredentials, AuthSession } from "@/types";

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------
const AUTH_QUERY_KEY = ["auth", "me"] as const;

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------
interface AuthContextValue {
    /** Usuario autenticado actualmente, o null si no hay sesión. */
    user: User | null;
    /** True mientras se verifica si hay una sesión activa. */
    isLoading: boolean;
    /** True si el usuario está autenticado. */
    isAuthenticated: boolean;
    /** Inicia sesión. Lanza error si las credenciales son inválidas. */
    signIn: (credentials: LoginCredentials) => Promise<void>;
    /** Cierra la sesión y redirige a /login. */
    signOut: () => Promise<void>;
    /** True mientras la mutación de login está en vuelo. */
    isSigningIn: boolean;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const qc = useQueryClient();
    const router = useRouter();

    // ── Obtener usuario actual ───────────────────────────────────────────────
    const {
        data: user = null,
        isLoading,
    } = useQuery<User | null>({
        queryKey: AUTH_QUERY_KEY,
        queryFn: async () => {
            // Si no hay token en localStorage, no hacemos la petición
            if (typeof window !== "undefined" && !localStorage.getItem(TOKEN_KEY)) {
                return null;
            }
            try {
                return await getMe();
            } catch {
                // 401 → el interceptor ya limpió los tokens
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,  // 5 min — no re-fetcha en cada render
        retry: false,
    });

    // ── Mutación de login ────────────────────────────────────────────────────
    const loginMutation = useMutation<AuthSession, Error, LoginCredentials>({
        mutationFn: login,
        onSuccess: (session) => {
            // Guardar tokens
            localStorage.setItem(TOKEN_KEY, session.tokens.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);

            // Para poder navegar con el mock y que el proxy no tire error:
            document.cookie = `${TOKEN_KEY}=${session.tokens.accessToken}; path=/; max-age=86400; SameSite=Lax`;

            // Hidrata la caché de React Query con el usuario
            qc.setQueryData<User>(AUTH_QUERY_KEY, session.user);
            router.push("/dashboard");
        },
    });

    // ── Mutación de logout ───────────────────────────────────────────────────
    const logoutMutation = useMutation<void, Error, void>({
        mutationFn: logout,
        onSettled: () => {
            // Siempre limpiar, sin importar si el backend respondió bien
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`; // Limpiar cookie mock
            qc.clear();
            router.push("/login");
        },
    });

    // ── Callbacks estables ───────────────────────────────────────────────────
    const signIn = useCallback(
        async (credentials: LoginCredentials): Promise<void> => {
            await loginMutation.mutateAsync(credentials);
        },
        [loginMutation]
    );

    const signOut = useCallback(async (): Promise<void> => {
        await logoutMutation.mutateAsync();
    }, [logoutMutation]);

    // ── Valor del contexto ───────────────────────────────────────────────────
    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isLoading,
            isAuthenticated: Boolean(user),
            signIn,
            signOut,
            isSigningIn: loginMutation.isPending,
        }),
        [user, isLoading, signIn, signOut, loginMutation.isPending]
    );

    return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook de consumo
// ---------------------------------------------------------------------------

/**
 * useAuth — accede al contexto de autenticación desde cualquier componente.
 *
 * @throws Error si se usa fuera de un `<AuthProvider>`.
 *
 * @example
 * const { user, signIn, signOut, isAuthenticated } = useAuth();
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error(
            "useAuth debe usarse dentro de un <AuthProvider>. " +
            "Envuelve tu app con <AuthProvider> en el layout raíz."
        );
    }
    return ctx;
}
