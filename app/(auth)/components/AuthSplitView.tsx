import React from "react";
import Link from "next/link";
import { AccessibilityMenu } from "@/components/ui/AccessibilityMenu";
import { Brand } from "@/components/Brand";

interface AuthSplitViewProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footerText?: React.ReactNode;
}

export function AuthSplitView({ title, subtitle, children, footerText }: AuthSplitViewProps) {
    return (
        <>
            {/* Accessibility global for auth */}
            <div className="absolute top-6 right-6 z-[9000]">
                <AccessibilityMenu />
            </div>

            {/* ── Panel izquierdo: brand visual ─────────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[50%] flex-col relative overflow-hidden justify-center items-center text-center p-12"
                style={{ background: "var(--color-sidebar-bg)" }}
            >
                <div className="relative z-10 flex flex-col items-center max-w-md">
                    <Brand
                        variant="isotipo"
                        alt="Isotipo de Nexus"
                        className="h-40 w-40 xl:h-44 xl:w-44 object-contain mb-8 origin-center scale-105 drop-shadow-2xl"
                    />

                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-4"
                        style={{ color: "var(--color-sidebar-text-active)" }}>
                        Nexus
                    </h1>

                    <p className="text-lg xl:text-xl"
                        style={{ color: "var(--color-brand-light)" }}>
                        Gestión de bodegas e inventario
                    </p>
                </div>

                <div className="absolute bottom-10 text-sm font-medium opacity-50"
                    style={{ color: "var(--color-brand-light)" }}>
                    © {new Date().getFullYear()} Nexus WMS
                </div>
            </div>

            {/* ── Panel derecho: formulario ──────────────────────────────────────── */}
            <div
                className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 relative"
                style={{ background: "var(--color-surface-app)" }}
            >
                <div className="absolute top-6 left-6 lg:left-12">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-default/40 focus-visible:ring-offset-2 rounded-md px-1 py-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Volver al inicio
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-8">

                    {/* Header del formulario */}
                    <div className="space-y-1">
                        {/* Logo mobile */}
                        <div className="flex items-center gap-2 mb-6 lg:hidden">
                            <Brand
                                variant="logomarca"
                                alt="Logomarca Nexus"
                                className="h-8 w-auto object-contain"
                            />
                        </div>

                        <h2 className="text-2xl font-bold"
                            style={{ color: "var(--color-text-primary)" }}>
                            {title}
                        </h2>
                        <p className="text-sm"
                            style={{ color: "var(--color-text-tertiary)" }}>
                            {subtitle}
                        </p>
                    </div>

                    {/* Contenido / Formulario */}
                    <div
                        className="rounded-2xl border p-7 shadow-sm"
                        style={{
                            background: "var(--color-surface-base)",
                            borderColor: "var(--color-border-default)",
                        }}
                    >
                        {children}
                    </div>

                    {/* Footer opcional (Nota de seguridad) */}
                    {footerText && (
                        <p className="text-center text-xs"
                            style={{ color: "var(--color-text-disabled)" }}>
                            {footerText}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
