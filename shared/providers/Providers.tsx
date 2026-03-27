"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
            .catch(() => undefined)
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
