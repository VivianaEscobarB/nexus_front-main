"use client";

import { useAccessibility } from "@/shared/hooks/useAccessibility";
import { useState, useRef, useEffect } from "react";

function AccessibilityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM5.5 8.25a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5v9.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6.5h-1v6.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-9.5H6.25a.75.75 0 01-.75-.75v-1.5z" clipRule="evenodd" />
        </svg>
    );
}

export interface AccessibilityMenuProps {
    /** @default "floating" */
    variant?: "floating" | "header";
}

export function AccessibilityMenu({ variant = "floating" }: AccessibilityMenuProps) {
    const isFloating = variant === "floating";
    const {
        state,
        increaseFontSize,
        decreaseFontSize,
        toggleDyslexiaFont,
        toggleHighContrast,
        resetAccessibility,
    } = useAccessibility();

    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} className={isFloating ? "fixed bottom-6 right-6 z-50" : "relative shrink-0"}>
            {isOpen && (
                <div className={`${
                    isFloating 
                        ? "absolute bottom-[calc(100%+16px)] right-0" 
                        : "absolute top-[calc(100%+8px)] right-0"
                } w-72 rounded-2xl bg-surface-raised border border-border shadow-2xl p-5 flex flex-col gap-5 text-text-primary z-50 opacity-100 transition-opacity animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <h3 className="font-semibold text-lg text-text-primary">Accesibilidad</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-text-tertiary hover:text-text-primary focus:outline-none rounded-md px-2 py-1 transition"
                            aria-label="Cerrar menú de accesibilidad"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Text Size */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-secondary">Tamaño texto</span>
                            <div className="flex items-center gap-1 bg-surface-hover rounded-xl p-1 border border-border">
                                <button
                                    onClick={decreaseFontSize}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-base border border-border shadow-sm text-text-primary hover:bg-surface-hover transition focus:outline-none focus:ring-2 focus:ring-border-focus"
                                    aria-label="Reducir texto"
                                >
                                    -
                                </button>
                                <span className="text-xs font-bold w-12 text-center text-text-primary">{state.fontSize}%</span>
                                <button
                                    onClick={increaseFontSize}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-base border border-border shadow-sm text-text-primary hover:bg-surface-hover transition focus:outline-none focus:ring-2 focus:ring-border-focus"
                                    aria-label="Aumentar texto"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Dyslexia Font */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-secondary">Fuente dislexia</span>
                            <button
                                onClick={toggleDyslexiaFont}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 ${
                                    state.dyslexiaFont ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-600"
                                }`}
                                aria-pressed={state.dyslexiaFont}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        state.dyslexiaFont ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* High Contrast */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-secondary">Alto contraste</span>
                            <button
                                onClick={toggleHighContrast}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 ${
                                    state.highContrast ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-600"
                                }`}
                                aria-pressed={state.highContrast}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        state.highContrast ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="border-t border-border mt-1 pt-4">
                            {/* Reset */}
                            <button
                                onClick={resetAccessibility}
                                className="w-full rounded-xl bg-surface-hover border border-border py-2 text-sm font-semibold text-text-primary hover:brightness-95 dark:hover:brightness-110 transition focus:outline-none focus:ring-2 focus:ring-border-focus"
                            >
                                Restablecer ajustes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={isFloating 
                    ? "flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform duration-200 hover:scale-105"
                    : "inline-flex items-center justify-center rounded-full w-9 h-9 bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                }
                aria-label={isOpen ? "Cerrar menú de accesibilidad" : "Abrir menú de accesibilidad"}
                aria-expanded={isOpen}
            >
                <div className={isFloating ? "" : "w-5 h-5 flex items-center justify-center translate-y-[0.5px]"}>
                    <AccessibilityIcon />
                </div>
            </button>
        </div>
    );
}
