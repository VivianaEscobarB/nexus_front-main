import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSplitView } from "../components/AuthSplitView";
import { ActivateAccountForm } from "./ActivateAccountForm";

export const metadata: Metadata = {
    title: "Activar cuenta - Nexus",
    description:
        "Define tu contraseña para activar tu cuenta y acceder a Nexus.",
};

export default function ActivateAccountPage() {
    return (
        <AuthSplitView
            title="Activar cuenta"
            subtitle="Crea tu contraseña para completar la activación de tu cuenta y acceder al sistema."
        >
            <Suspense
                fallback={
                    <div className="flex justify-center p-8 animate-pulse text-sm">
                        Cargando formulario...
                    </div>
                }
            >
                <ActivateAccountForm />
            </Suspense>
        </AuthSplitView>
    );
}
