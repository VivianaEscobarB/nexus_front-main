"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/modules/auth/state/authStore";

export function useRequireAuth(redirectTo: string = "/login") {
    const router = useRouter();
    const auth = useAuthStore();

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            router.replace(redirectTo);
        }
    }, [auth.isAuthenticated, auth.isLoading, redirectTo, router]);

    return auth;
}

export const requireAuth = useRequireAuth;
