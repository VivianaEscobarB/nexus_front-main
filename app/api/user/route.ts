import { appEnv } from "@/lib/config/env";
import { NextRequest, NextResponse } from "next/server";

type UserProfile = {
    name: string;
    email: string;
    avatarUrl: string;
};

// Demo store en memoria aislado por sesión para evitar mezcla de usuarios.
const userDataBySession = new Map<string, UserProfile>();

const defaultUserData: UserProfile = {
    name: "Viviana E",
    email: "viviana@nexus.com",
    avatarUrl: "",
};

function getSessionId(request: NextRequest): string | null {
    return request.cookies.get(appEnv.sessionCookieName)?.value ?? null;
}

function getOrCreateUserData(sessionId: string): UserProfile {
    const existing = userDataBySession.get(sessionId);
    if (existing) return existing;
    const initial = { ...defaultUserData };
    userDataBySession.set(sessionId, initial);
    return initial;
}

export async function GET(request: NextRequest) {
    const sessionId = getSessionId(request);
    if (!sessionId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Simulamos un leve retraso para mostrar el estado de carga (loading)
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json(getOrCreateUserData(sessionId));
}

export async function PUT(request: NextRequest) {
    const sessionId = getSessionId(request);
    if (!sessionId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, avatarUrl } = body;

        // Validación básica
        if (!name || !email) {
            return NextResponse.json(
                { error: "Nombre y correo son obligatorios" },
                { status: 400 }
            );
        }

        // Simulamos un leve retraso de procesamiento
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Actualizamos los datos de la sesión activa.
        const currentUserData = getOrCreateUserData(sessionId);
        const updatedUserData: UserProfile = {
            ...currentUserData,
            name,
            email,
            avatarUrl,
        };
        userDataBySession.set(sessionId, updatedUserData);

        return NextResponse.json({
            message: "Perfil actualizado correctamente",
            user: updatedUserData,
        });
    } catch {
        return NextResponse.json(
            { error: "Error al procesar la solicitud" },
            { status: 500 }
        );
    }
}
