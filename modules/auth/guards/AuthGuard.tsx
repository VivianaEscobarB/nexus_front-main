"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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

    useEffect(() => {
        if (auth.isLoading) {
            return;
        }

        if (!auth.isAuthenticated) {
            router.replace(buildLoginRedirectUrl(redirectTo, pathname));
        }
    }, [auth.isAuthenticated, auth.isLoading, pathname, redirectTo, router]);

    if (auth.isLoading) {
        return fallback ?? null;
    }

    if (!auth.isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
