"use client";

import * as React from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: ModalSize;
    closeOnBackdrop?: boolean;
    showCloseButton?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-[95vw]",
};

function CloseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

function Modal({
    isOpen, onClose, title, description, children, footer,
    size = "md", closeOnBackdrop = true, showCloseButton = true,
}: ModalProps) {
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) return;
        function handleKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    React.useEffect(() => {
        if (!isOpen) return;
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first?.focus();
        function trapFocus(e: KeyboardEvent) {
            if (e.key !== "Tab") return;
            if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
            else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
        }
        panel.addEventListener("keydown", trapFocus);
        return () => panel.removeEventListener("keydown", trapFocus);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
            aria-describedby={description ? "modal-description" : undefined}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}>

            <div ref={panelRef} className={[
                "relative w-full bg-surface-overlay rounded-xl shadow-2xl",
                "flex flex-col max-h-[90vh]",
                SIZE_CLASSES[size],
            ].join(" ")}>

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle">
                    <div className="flex flex-col gap-1">
                        <h2 id="modal-title"
                            className="text-base font-semibold text-text-primary leading-tight">
                            {title}
                        </h2>
                        {description && (
                            <p id="modal-description" className="text-sm text-text-tertiary">{description}</p>
                        )}
                    </div>
                    {showCloseButton && (
                        <button onClick={onClose}
                            className="ml-4 flex-shrink-0 rounded-md p-1.5 text-text-tertiary
                transition-colors hover:bg-surface-hover hover:text-text-primary
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            aria-label="Cerrar">
                            <CloseIcon />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 text-text-primary">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export { Modal };
export type { ModalProps, ModalSize };
