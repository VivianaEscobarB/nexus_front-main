"use client";

import { useTheme } from "@/hooks/useTheme";

type BrandProps = {
    variant?: "isotipo" | "logomarca";
    surfaceTone?: "auto" | "light" | "dark";
    className?: string;
    alt?: string;
};

export function Brand({
    variant = "logomarca",
    surfaceTone = "auto",
    className = "",
    alt = "Nexus",
}: BrandProps) {
    const { resolvedTheme } = useTheme();

    const effectiveTone =
        surfaceTone === "auto"
            ? resolvedTheme === "dark"
                ? "dark"
                : "light"
            : surfaceTone;

    const src =
        variant === "isotipo"
            ? "/brand/isotipo.svg"
            : effectiveTone === "dark"
                ? "/brand/logomarca-dark.svg"
                : "/brand/logomarca-light.svg";

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            draggable={false}
        />
    );
}
