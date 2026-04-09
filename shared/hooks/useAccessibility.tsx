"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AccessibilityState {
    fontSize: number; // Percentage, e.g., 100, 110, 120
    dyslexiaFont: boolean;
    highContrast: boolean;
}

interface AccessibilityContextValue {
    state: AccessibilityState;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    toggleDyslexiaFont: () => void;
    toggleHighContrast: () => void;
    resetAccessibility: () => void;
}

const defaultState: AccessibilityState = {
    fontSize: 100,
    dyslexiaFont: false,
    highContrast: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

const A11Y_STORAGE_KEY = "nexus_accessibility_prefs";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AccessibilityState>(defaultState);

    // Initialize from local storage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(A11Y_STORAGE_KEY);
            if (stored) {
                setState(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to restore accessibility preferences", error);
        }
    }, []);

    // Persist and apply changes
    useEffect(() => {
        localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(state));

        // Apply classes to HTML
        const html = document.documentElement;

        // Dyslexia font
        if (state.dyslexiaFont) {
            html.dataset.accessibilityFont = "dyslexia";
        } else {
            delete html.dataset.accessibilityFont;
        }

        // High contrast
        if (state.highContrast) {
            html.dataset.accessibilityContrast = "high";
        } else {
            delete html.dataset.accessibilityContrast;
        }

        // Font size
        if (state.fontSize !== 100) {
            html.style.fontSize = `${state.fontSize}%`;
        } else {
            html.style.fontSize = ""; // reset to default
        }

    }, [state]);

    const increaseFontSize = () => {
        setState((prev) => ({ ...prev, fontSize: Math.min(prev.fontSize + 10, 150) })); // Max 150%
    };

    const decreaseFontSize = () => {
        setState((prev) => ({ ...prev, fontSize: Math.max(prev.fontSize - 10, 80) })); // Min 80%
    };

    const toggleDyslexiaFont = () => {
        setState((prev) => ({ ...prev, dyslexiaFont: !prev.dyslexiaFont }));
    };

    const toggleHighContrast = () => {
        setState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
    };

    const resetAccessibility = () => {
        setState(defaultState);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                state,
                increaseFontSize,
                decreaseFontSize,
                toggleDyslexiaFont,
                toggleHighContrast,
                resetAccessibility,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error("useAccessibility must be used within an AccessibilityProvider");
    }
    return context;
}
