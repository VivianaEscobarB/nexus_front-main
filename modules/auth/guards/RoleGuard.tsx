"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { buildLoginRedirectUrl } from "@/modules/auth/guards/guardUtils";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { UserRole } from "@/types";

type AllowedRole = UserRole | string;
type UnauthorizedMode = "forbidden" | "redirect";

interface RoleGuardProps {
    allowedRoles: readonly AllowedRole[];
    children: ReactNode;
    unauthorizedMode?: UnauthorizedMode;
    redirectTo?: string;
    loadingFallback?: ReactNode;
    unauthorizedFallback?: ReactNode;
}

function hasAllowedRole(
    currentRoles: string[],
    allowedRoles: readonly AllowedRole[]
): boolean {
    const roleSet = new Set(currentRoles);
    return allowedRoles.some((role) => roleSet.has(role));
}

export function RoleGuard({
    allowedRoles,
    children,
    unauthorizedMode = "forbidden",
    redirectTo = "/dashboard",
    loadingFallback,
    unauthorizedFallback,
}: RoleGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, initialized, isLoading, isAuthenticated } = useAuth();
    const isAuthReady = initialized && !isLoading;

    const currentRoles = user?.roles?.map((role) => role.role_name) ?? [];
    const isAllowed = hasAllowedRole(currentRoles, allowedRoles);

    useEffect(() => {
        if (!isAuthReady) return;

        if (!isAuthenticated) {
            router.replace(buildLoginRedirectUrl("/login", pathname));
            return;
        }

        if (!isAllowed && unauthorizedMode === "redirect") {
            router.replace(redirectTo);
        }
    }, [
        initialized,
        isAllowed,
        isAuthenticated,
        isLoading,
        isAuthReady,
        pathname,
        redirectTo,
        router,
        unauthorizedMode,
    ]);

    if (!isAuthReady) {
        return loadingFallback ?? null;
    }

    if (!isAuthenticated) {
        return null;
    }

    if (isAllowed) {
        return <>{children}</>;
    }

    if (unauthorizedMode === "redirect") {
        return null;
    }

    return unauthorizedFallback ?? <RoleGuardForbiddenState />;
}

function RoleGuardForbiddenState() {
    return (
        <div className="mx-auto max-w-2xl rounded-2xl border p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)]">
                <span className="text-xl font-bold">403</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-[var(--color-text-primary)]">
                Acceso restringido
            </h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                Tu rol actual no tiene permisos para ver esta seccion del dashboard.
            </p>
            <div className="mt-6 flex justify-center">
                <Link href="/dashboard">
                    <Button variant="primary">Volver al dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
