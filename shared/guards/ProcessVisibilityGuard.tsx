"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
    isBusinessProcessVisible,
    type BusinessProcess,
} from "@/shared/config/processVisibility";

interface ProcessVisibilityGuardProps {
    process: BusinessProcess;
    children: ReactNode;
    fallbackHref?: string;
}

export function ProcessVisibilityGuard({
    process,
    children,
    fallbackHref = "/dashboard",
}: ProcessVisibilityGuardProps) {
    const router = useRouter();
    const isVisible = isBusinessProcessVisible(process);

    React.useEffect(() => {
        if (!isVisible) {
            router.replace(fallbackHref);
        }
    }, [fallbackHref, isVisible, router]);

    if (!isVisible) {
        return null;
    }

    return <>{children}</>;
}
