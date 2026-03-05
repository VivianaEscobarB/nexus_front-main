"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import type { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

/**
 * Providers — wrapper raíz que combina todos los contextos globales.
 *
 * Árbol de proveedores:
 *   ThemeProvider        ← tema claro / oscuro / sistema
 *     QueryClientProvider  ← caché y sincronización de datos
 *       AuthProvider       ← sesión y usuario autenticado
 *         {children}
 */
export function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>{children}</AuthProvider>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </ThemeProvider>
    );
}
