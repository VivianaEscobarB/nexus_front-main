"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { appEnv } from "@/lib/config/env";
import { queryClient } from "@/lib/query/query-client";
import { AuthProvider } from "@/modules/auth/hooks/useAuth";
import { ensureCsrfToken } from "@/shared/api/csrf";
import { ThemeProvider } from "@/shared/hooks/useTheme";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [isCsrfReady, setIsCsrfReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        ensureCsrfToken()
            .catch((error) => {
                if (appEnv.isDevelopment) {
                    console.error("[csrf] initial bootstrap failed", error);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsCsrfReady(true);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                {isCsrfReady ? <AuthProvider>{children}</AuthProvider> : null}
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </ThemeProvider>
    );
}
