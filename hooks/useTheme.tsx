"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    useCallback,
    type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    /** Tema activo seleccionado por el usuario. */
    theme: Theme;
    /** Tema que se está aplicando en este momento (resuelve "system" al tema real). */
    resolvedTheme: "light" | "dark";
    /** Cambia el tema y lo persiste en localStorage. */
    setTheme: (theme: Theme) => void;
    /** Alterna entre light → dark → system → light … */
    cycleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "nexus_theme";
const CYCLE: Theme[] = ["light", "dark", "system"];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");

    // Leer preferencia guardada en localStorage (solo en cliente)
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && CYCLE.includes(stored)) {
            setThemeState(stored);
        }
    }, []);

    // Calcular el tema resuelto (en "system" hay que leer la media query)
    const resolvedTheme = useMemo<"light" | "dark">(() => {
        if (theme === "system") {
            if (typeof window === "undefined") return "light";
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }
        return theme;
    }, [theme]);

    // Aplicar el data-theme en <html> cada vez que cambia
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "system") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", theme);
        }
    }, [theme]);

    // Cuando el tema es "system", escuchar cambios de preferencia del OS
    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        // Forzar re-render cuando cambia la preferencia del sistema
        const handler = () => setThemeState("system");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const cycleTheme = useCallback(() => {
        const idx = CYCLE.indexOf(theme);
        const next = CYCLE[(idx + 1) % CYCLE.length];
        setTheme(next);
    }, [theme, setTheme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
        [theme, resolvedTheme, setTheme, cycleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook de consumo
// ---------------------------------------------------------------------------

/**
 * useTheme — accede al contexto de tema desde cualquier componente.
 *
 * @example
 * const { theme, resolvedTheme, setTheme, cycleTheme } = useTheme();
 */
export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
    }
    return ctx;
}

// ---------------------------------------------------------------------------
// Script de hidratación temprana (evita flash of wrong theme)
// Pégalo en <head> como script inline antes de cualquier CSS.
// ---------------------------------------------------------------------------

/**
 * ThemeScript — inyecta la preferencia de tema ANTES de que React hidrate,
 * evitando el parpadeo de colores (FOUC) en el primer render.
 *
 * Úsalo en app/layout.tsx dentro de <head>:
 *   <ThemeScript />
 */
export function ThemeScript() {
    const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        if (stored === 'dark')  document.documentElement.setAttribute('data-theme', 'dark');
        if (stored === 'light') document.documentElement.setAttribute('data-theme', 'light');
        // 'system' → sin atributo → el CSS media query se encarga
      } catch (_) {}
    })();
  `;
    // dangerouslySetInnerHTML es seguro aquí: el contenido es estático y controlado
    return (
        <script
            dangerouslySetInnerHTML={{ __html: script }}
            suppressHydrationWarning
        />
    );
}
