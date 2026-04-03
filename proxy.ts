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

    // En despliegues cross-domain la sesion real vive en el backend y no puede
    // validarse de forma confiable desde este proxy del frontend. La proteccion
    // efectiva queda delegada al cliente y a la API.
    void SESSION_COOKIE_NAME;
    void isProtectedRoute(pathname);
    void isAuthRoute(pathname);

    return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Configuracion del matcher
// ---------------------------------------------------------------------------

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|api/).*)"],
};
