import type { Metadata } from "next";
import { Providers } from "@/providers/Providers";
import { ThemeScript } from "@/hooks/useTheme";
import { AccessibilityMenu } from "@/components/ui/AccessibilityMenu";

import "./globals.css";

const fontVariables = {
  "--font-geist-sans":
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-geist-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as React.CSSProperties &
  Record<"--font-geist-sans" | "--font-geist-mono", string>;

export const metadata: Metadata = {
  title: "Nexus — Gestión de Bodegas e Inventario",
  description:
    "Sistema de gestión de bodegas, inventario y movimientos de stock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Inyecta data-theme ANTES de que React hidrate → evita parpadeo */}
        <ThemeScript />
      </head>
      <body
        className="antialiased"
        style={fontVariables}
      >
        <Providers>
            <AccessibilityMenu />
            {children}
        </Providers>
      </body>
    </html>
  );
}

