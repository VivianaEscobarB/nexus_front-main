"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/modules/auth/state/authStore";
import { buildLoginRedirectUrl } from "@/modules/auth/guards/guardUtils";

export function useRequireAuth(redirectTo: string = "/login") {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuthStore();

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            router.replace(buildLoginRedirectUrl(redirectTo, pathname));
        }
    }, [auth.isAuthenticated, auth.isLoading, pathname, redirectTo, router]);

    return auth;
}

export const requireAuth = useRequireAuth;
