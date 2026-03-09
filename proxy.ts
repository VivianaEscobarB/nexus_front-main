import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuración de rutas
// ---------------------------------------------------------------------------

/** Rutas que requieren sesión activa. */
const PROTECTED_PREFIXES = ["/dashboard"] as const;

/** Rutas de autenticación — redirigen al dashboard si ya hay sesión. */
const AUTH_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"] as const;

/** Nombre de la cookie donde el backend deposita el JWT (HttpOnly). */
const ACCESS_TOKEN_COOKIE = "nexus_access_token";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
    if (pathname === "/") return true;
    return AUTH_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
}

function decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
    );

    if (typeof atob === "function") {
        return atob(padded);
    }

    return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Verifica si el token JWT no ha expirado comprobando el campo `exp`
 * del payload. Esta comprobación es superficial (no verifica la firma)
 * pero es segura para el middleware de Edge: la firma se valida en el
 * servidor de la API en cada petición real.
 */
function isTokenExpired(token: string): boolean {
    try {
        const [, payloadB64] = token.split(".");
        if (!payloadB64) return true;

        const payload = JSON.parse(
            decodeBase64Url(payloadB64)
        ) as { exp?: number };

        if (!payload.exp) return true;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

// ---------------------------------------------------------------------------
// Middleware principal
// ---------------------------------------------------------------------------

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    // Leer el token de la cookie HttpOnly establecida por el backend / login
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const isAuthenticated = Boolean(token && !isTokenExpired(token));

    // 1. Ruta protegida sin sesión válida → /login
    if (isProtectedRoute(pathname) && !isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        // Guarda la ruta original para redirigir después del login
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Ruta de autenticación con sesión activa → /dashboard
    if (isAuthRoute(pathname) && isAuthenticated) {
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // 3. Permitir la petición sin modificaciones
    return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Configuración del matcher
// ---------------------------------------------------------------------------

/**
 * El matcher excluye archivos estáticos y las rutas internas de Next.js
 * para no ejecutar el middleware en cada asset (imágenes, fuentes, etc.).
 */
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public/|api/).*)",
    ],
};
