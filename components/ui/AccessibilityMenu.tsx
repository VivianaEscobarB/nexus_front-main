"use client";

import { useAccessibility } from "@/shared/hooks/useAccessibility";
import { useTheme } from "@/shared/hooks/useTheme";
import { useState, useRef, useEffect } from "react";

// --- Icons ---

function AccessibilityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM5.5 8.25a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5v9.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6.5h-1v6.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-9.5H6.25a.75.75 0 01-.75-.75v-1.5z" clipRule="evenodd" />
        </svg>
    );
}

function ContrastIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

function PaperPlaneIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 rotate-45">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}

function ResetIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polyline points="3 3 3 8 8 8" />
        </svg>
    );
}

// --- Menu Component ---

export function AccessibilityMenu() {
    const {
        state,
        increaseFontSize,
        decreaseFontSize,
        toggleDyslexiaFont,
        toggleHighContrast,
        resetAccessibility,
    } = useAccessibility();

    const { cycleTheme } = useTheme();

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
        <div ref={menuRef} className="fixed top-6 right-6 z-[9999] flex flex-col items-center gap-3">
            {/* Toggle Button (Always at the top) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-2 border-text-onbrand/20
                    ${isOpen ? "bg-surface-base text-brand-default rotate-90" : "bg-brand-default text-onbrand hover:scale-110 active:scale-95"}
                `}
                aria-label={isOpen ? "Cerrar menú de accesibilidad" : "Abrir menú de accesibilidad"}
                aria-expanded={isOpen}
            >
                <AccessibilityIcon />
            </button>

            {/* Vertical Pill Bar (Deploys downwards) */}
            <div 
                className={`flex flex-col items-center gap-1 transition-all duration-500 origin-top
                    ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 -translate-y-4 pointer-events-none"}
                `}
            >
                <div className="bg-brand-default p-2 rounded-full flex flex-col items-center gap-2 shadow-2xl border border-text-onbrand/10">
                    {/* Contrast */}
                    <MenuButton 
                        onClick={toggleHighContrast} 
                        active={state.highContrast} 
                        title="Togle alto contraste"
                    >
                        <ContrastIcon />
                    </MenuButton>

                    {/* Theme / Brightness */}
                    <MenuButton onClick={cycleTheme} title="Cambiar tema (Brillo)">
                        <SunIcon />
                    </MenuButton>

                    {/* Font Size Smaller */}
                    <MenuButton onClick={decreaseFontSize} title="Reducir fuente">
                        <span className="text-xl font-bold leading-none select-none">A-</span>
                    </MenuButton>

                    {/* Font Size Larger */}
                    <MenuButton onClick={increaseFontSize} title="Aumentar fuente">
                        <span className="text-xl font-bold leading-none select-none">A+</span>
                    </MenuButton>

                    {/* Reading Mode / Dyslexia */}
                    <MenuButton 
                        onClick={toggleDyslexiaFont} 
                        active={state.dyslexiaFont} 
                        title="Fuente para dislexia"
                    >
                        <PaperPlaneIcon />
                    </MenuButton>

                    <div className="w-8 h-[1px] bg-text-onbrand/20 my-1" />

                    {/* Reset */}
                    <MenuButton onClick={resetAccessibility} title="Restablecer ajustes">
                        <ResetIcon />
                    </MenuButton>
                </div>
            </div>
        </div>
    );
}

interface MenuButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    title?: string;
}

function MenuButton({ children, onClick, active, title }: MenuButtonProps) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200
                ${active 
                    ? "bg-surface-base text-brand-default shadow-inner" 
                    : "text-onbrand hover:bg-text-onbrand/20 active:bg-text-onbrand/40"}
            `}
        >
            {children}
        </button>
    );
}
