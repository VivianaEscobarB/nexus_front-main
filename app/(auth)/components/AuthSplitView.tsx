import React from "react";
import Link from "next/link";

interface AuthSplitViewProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footerText?: React.ReactNode;
}

export function AuthSplitView({ title, subtitle, children, footerText }: AuthSplitViewProps) {
    return (
        <>
            {/* ── Panel izquierdo: brand visual ─────────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[50%] flex-col relative overflow-hidden justify-center items-center text-center p-12"
                style={{ background: "var(--color-sidebar-bg)" }}
            >
                <Link href="/" className="relative z-10 flex flex-col items-center max-w-md transition-opacity hover:opacity-90">
                    <img
                        src="/logo.svg"
                        alt="Nexus Logo"
                        className="h-32 w-32 object-contain mb-8 origin-center scale-110 drop-shadow-2xl"
                    />

                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-4"
                        style={{ color: "var(--color-text-inverse)" }}>
                        Nexus
                    </h1>

                    <p className="text-lg xl:text-xl"
                        style={{ color: "var(--color-brand-light)" }}>
                        Gestión de bodegas e inventario
                    </p>
                </Link>

                <div className="absolute bottom-10 text-sm font-medium opacity-50"
                    style={{ color: "var(--color-brand-light)" }}>
                    © {new Date().getFullYear()} Nexus WMS
                </div>
            </div>

            {/* ── Panel derecho: formulario ──────────────────────────────────────── */}
            <div
                className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12"
                style={{ background: "var(--color-surface-app)" }}
            >
                <div className="w-full max-w-md space-y-8">

                    {/* Header del formulario */}
                    <div className="space-y-1">
                        {/* Logo mobile */}
                        <Link href="/" className="flex items-center gap-2 mb-6 lg:hidden transition-opacity hover:opacity-80">
                            <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm"
                                style={{ background: "var(--color-brand-strong)", color: "var(--color-text-inverse)" }}
                            >
                                <img src="/logo.svg" alt="Nexus Logo" className="h-5 w-5 object-contain" />
                            </div>
                            <span className="font-bold text-lg"
                                style={{ color: "var(--color-text-primary)" }}>
                                Nexus
                            </span>
                        </Link>

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
