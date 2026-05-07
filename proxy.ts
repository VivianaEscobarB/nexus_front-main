import { appEnv } from "@/lib/config/env";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuracion de rutas
// ---------------------------------------------------------------------------

/** Rutas que requieren sesion activa. */
const PROTECTED_PREFIXES = ["/dashboard"] as const;

/** Rutas de autenticacion; redirigen al dashboard si ya hay sesion. */
const AUTH_ROUTES = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/activate-account",
] as const;

/** Nombre de la cookie HttpOnly que indica una sesion potencialmente activa. */
const SESSION_COOKIE_NAME = appEnv.sessionCookieName;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
    if (pathname === "/") return true;
    return AUTH_ROUTES.some(
        (route) => route !== "/" && pathname.startsWith(route)
    );
}

// ---------------------------------------------------------------------------
// Middleware principal
// ---------------------------------------------------------------------------

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;
    const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

    // En despliegues cross-domain no podemos validar toda la sesion aqui, pero
    // al menos evitamos exponer vistas protegidas si no hay cookie de sesion.
    if (isProtectedRoute(pathname) && !hasSessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute(pathname) && hasSessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Configuracion del matcher
// ---------------------------------------------------------------------------

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|api/).*)"],
};
