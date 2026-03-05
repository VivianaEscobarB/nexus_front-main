import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { AuthSplitView } from "../components/AuthSplitView";

export const metadata: Metadata = {
    title: "Iniciar sesión — Nexus",
    description: "Accede al sistema de gestión de bodegas e inventario.",
};

export default function LoginPage() {
    return (
        <AuthSplitView
            title="Bienvenido de vuelta"
            subtitle="Ingresa tus credenciales para acceder al sistema"
            footerText="Acceso restringido. Usa las credenciales asignadas por tu administrador."
        >
            <LoginForm />
        </AuthSplitView>
    );
}
