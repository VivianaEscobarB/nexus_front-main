"use client";

import { useTheme, type Theme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Íconos inline
// ---------------------------------------------------------------------------

function SunIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
            fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
            fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd"
                d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
                clipRule="evenodd" />
        </svg>
    );
}

function SystemIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
            fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd"
                d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 1 1.1 1.677A.75.75 0 0 1 13 17.5H7a.75.75 0 0 1-.745-.823A3.501 3.501 0 0 1 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0v7.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75H4.25a.75.75 0 0 0-.75.75Z"
                clipRule="evenodd" />
        </svg>
    );
}

const ICONS: Record<Theme, React.ReactNode> = {
    light: <SunIcon />,
    dark: <MoonIcon />,
    system: <SystemIcon />,
};

const LABELS: Record<Theme, string> = {
    light: "Tema claro",
    dark: "Tema oscuro",
    system: "Tema del sistema",
};

const NEXT_LABEL: Record<Theme, string> = {
    light: "Cambiar a oscuro",
    dark: "Cambiar a sistema",
    system: "Cambiar a claro",
};

// ---------------------------------------------------------------------------
// ThemeToggle
// ---------------------------------------------------------------------------

interface ThemeToggleProps {
    /** Muestra la etiqueta de texto junto al ícono. @default false */
    showLabel?: boolean;
    className?: string;
}

/**
 * ThemeToggle — botón que alterna entre los tres modos de tema:
 * claro → oscuro → sistema → claro …
 *
 * @example
 * <ThemeToggle />                    // solo ícono
 * <ThemeToggle showLabel />          // ícono + texto
 */
function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
    const { theme, cycleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={cycleTheme}
            aria-label={NEXT_LABEL[theme]}
            title={NEXT_LABEL[theme]}
            className={[
                "inline-flex items-center gap-2 rounded-lg px-2.5 py-2",
                "text-text-tertiary transition-colors duration-150",
                "hover:bg-surface-hover hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                className,
            ].join(" ")}
        >
            {ICONS[theme]}
            {showLabel && (
                <span className="text-xs font-medium">{LABELS[theme]}</span>
            )}
        </button>
    );
}

export { ThemeToggle };
export type { ThemeToggleProps };

// Needed for JSX in icons
import React from "react";
