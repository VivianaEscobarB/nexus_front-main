import type { Metadata } from "next";
import { AuthSplitView } from "../components/AuthSplitView";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Crear nueva contraseña — Nexus",
    description: "Ingresa el código que te enviamos para cambiar la contraseña.",
};

export default function ResetPasswordPage() {
    return (
        <AuthSplitView
            title="Recuperar acceso"
            subtitle="Ingresa el código de 6 dígitos que te enviamos para verificar tu identidad y generar tu nueva clave segura."
        >
            <Suspense fallback={<div className="flex justify-center p-8 animate-pulse text-sm">Cargando formulario...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </AuthSplitView>
    );
}
