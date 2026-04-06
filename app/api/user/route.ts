import { NextResponse } from "next/server";

// Simular una base de datos en memoria para propósitos de demostración
let currentUserData = {
    name: "Viviana E",
    email: "viviana@nexus.com",
    avatarUrl: "",
};

export async function GET() {
    // Simulamos un leve retraso para mostrar el estado de carga (loading)
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json(currentUserData);
}

export async function PUT(request: Request) {
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

        // Actualizamos los datos
        currentUserData = {
            ...currentUserData,
            name,
            email,
            avatarUrl,
        };

        return NextResponse.json({
            message: "Perfil actualizado correctamente",
            user: currentUserData,
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al procesar la solicitud" },
            { status: 500 }
        );
    }
}
