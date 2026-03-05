import type { Metadata } from "next";
import { AuthSplitView } from "../components/AuthSplitView";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
    title: "Recuperar contraseña — Nexus",
    description: "Ingresa tu correo para recibir un código de recuperación.",
};

export default function ForgotPasswordPage() {
    return (
        <AuthSplitView
            title="Recuperar contraseña"
            subtitle="Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un código temporal para restablecerla."
        >
            <ForgotPasswordForm />
        </AuthSplitView>
    );
}
