"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
    cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "nexus_theme";
const CYCLE: Theme[] = ["light", "dark", "system"];

function getInitialTheme(): Theme {
    if (typeof window === "undefined") {
        return "system";
    }

    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored && CYCLE.includes(stored) ? stored : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    const resolvedTheme = useMemo<"light" | "dark">(() => {
        if (theme === "system") {
            if (typeof window === "undefined") return "light";

            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        return theme;
    }, [theme]);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "system") {
            root.removeAttribute("data-theme");
            return;
        }

        root.setAttribute("data-theme", theme);
    }, [theme]);

    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setThemeState("system");

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const cycleTheme = useCallback(() => {
        const index = CYCLE.indexOf(theme);
        const nextTheme = CYCLE[(index + 1) % CYCLE.length];
        setTheme(nextTheme);
    }, [theme, setTheme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
        [theme, resolvedTheme, setTheme, cycleTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
    }

    return context;
}

export function ThemeScript() {
    const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        if (stored === 'light') document.documentElement.setAttribute('data-theme', 'light');
      } catch (_) {}
    })();
  `;

    return (
        <script
            dangerouslySetInnerHTML={{ __html: script }}
            suppressHydrationWarning
        />
    );
}
