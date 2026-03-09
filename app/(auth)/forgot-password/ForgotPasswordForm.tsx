"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPassword } from "@/services/auth.service";

const forgotSchema = z.object({
    email: z
        .string()
        .min(1, "El correo es requerido")
        .email("Ingresa un correo válido"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

function MailIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4" aria-hidden="true">
            <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
            <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

export function ForgotPasswordForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [successEmail, setSuccessEmail] = React.useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormValues>({
        resolver: zodResolver(forgotSchema),
    });

    async function onSubmit(values: ForgotFormValues) {
        setIsLoading(true);
        setServerError(null);

        try {
            await forgotPassword({ email: values.email });
            setSuccessEmail(values.email);
        } catch (error) {
            setServerError(
                error instanceof Error
                    ? error.message
                    : "Hubo un error al procesar tu solicitud. Intenta nuevamente."
            );
        } finally {
            setIsLoading(false);
        }
    }

    if (successEmail) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-2 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)" }}>
                    <CheckCircleIcon />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
                    Código enviado
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                    Te hemos enviado un correo a <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{successEmail}</span> con tu código de validación de 6 dígitos. Revisa la bandeja de entrada y la de spam.
                </p>
                <div className="w-full flex gap-3 flex-col">
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={() => router.push(`/reset-password?email=${encodeURIComponent(successEmail)}`)}
                    >
                        Ingresar código ahora
                    </Button>
                    <Link href="/login" className="text-sm font-medium transition-colors hover:underline text-center w-full block mt-2"
                        style={{ color: "var(--color-text-tertiary)" }}>
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Error del servidor */}
            {serverError && (
                <div role="alert"
                    className="flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm"
                    style={{ background: "var(--color-danger-subtle)", borderColor: "var(--color-danger-default)", color: "var(--color-danger-text)" }}>
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 16 16"
                        fill="currentColor" aria-hidden="true">
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                    </svg>
                    {serverError}
                </div>
            )}

            {/* Email */}
            <Input
                label="Correo electrónico asociado"
                type="email"
                placeholder="usuario@empresa.com"
                autoComplete="email"
                leadingIcon={<MailIcon />}
                error={errors.email?.message}
                {...register("email")}
            />

            {/* Acciones */}
            <div className="flex flex-col gap-3 mt-2">
                <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
                    Enviar código de acceso
                </Button>

                <Link href="/login" className="text-sm font-medium text-center hover:underline transition-colors py-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Recordé mi contraseña, quiero volver
                </Link>
            </div>
        </form>
    );
}
