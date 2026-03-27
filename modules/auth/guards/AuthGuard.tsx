"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { appEnv } from "@/lib/config/env";
import { useAuthStore } from "@/modules/auth/state/authStore";
import { buildLoginRedirectUrl } from "@/modules/auth/guards/guardUtils";

interface AuthGuardProps {
    children: ReactNode;
    redirectTo?: string;
    fallback?: ReactNode;
}

export function AuthGuard({
    children,
    redirectTo = "/login",
    fallback,
}: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuthStore();
    const isAuthReady = auth.initialized && !auth.isLoading;

    useEffect(() => {
        if (!isAuthReady) {
            return;
        }

        if (!auth.isAuthenticated) {
            if (appEnv.isDevelopment) {
                console.log("[auth] guard:redirect-to-login", {
                    initialized: auth.initialized,
                    isAuthenticated: auth.isAuthenticated,
                    isLoading: auth.isLoading,
                    pathname,
                });
            }

            router.replace(buildLoginRedirectUrl(redirectTo, pathname));
        }
    }, [
        auth.initialized,
        auth.isAuthenticated,
        auth.isLoading,
        isAuthReady,
        pathname,
        redirectTo,
        router,
    ]);

    if (!isAuthReady) {
        return fallback ?? null;
    }

    if (!auth.isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
