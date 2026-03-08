"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/services/auth.service";

const resetSchema = z.object({
    code: z
        .string()
        .min(6, "El código de verificación debe tener 6 caracteres")
        .max(6, "El código es de exactamente 6 caracteres"),
    password: z
        .string()
        .min(8, "Al menos 8 caracteres requeridos")
        .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
        .regex(/[0-9]/, "Debe incluir al menos un número"),
    confirmPassword: z
        .string()
        .min(1, "Confirma la nueva contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

function LockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                clipRule="evenodd" />
        </svg>
    );
}

function EyeIcon({ show }: { show: boolean }) {
    return show ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4" aria-hidden="true">
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path fillRule="evenodd"
                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                clipRule="evenodd" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd"
                d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
                clipRule="evenodd" />
        </svg>
    );
}

function CheckCircleLgIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailHint = searchParams.get("email");

    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
        resolver: zodResolver(resetSchema),
    });

    async function onSubmit(values: ResetFormValues) {
        setIsLoading(true);
        setServerError(null);

        try {
            await resetPassword({
                token: values.code,
                newPassword: values.password,
            });
            setSuccess(true);
        } catch (error) {
            setServerError(
                error instanceof Error
                    ? error.message
                    : "El codigo es incorrecto o expiro. Por favor ingresalo nuevamente."
            );
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-2 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)" }}>
                    <CheckCircleLgIcon />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
                    ¡Contraseña actualizada!
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                    Tu nueva contraseña se guardó correctamente y tu cuenta está segura. Ya puedes volver a entrar al sistema.
                </p>
                <div className="w-full flex">
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={() => router.push("/login")}
                    >
                        Ir al panel de inicio de sesión
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
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

            {/* Email contextual para orientación (Opcional, visualmente no editable) */}
            {emailHint && (
                <div className="text-sm rounded-md px-3 py-2 border flex items-center gap-2"
                    style={{ background: "var(--color-surface-hover)", borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                    <span className="opacity-50 text-xs">A cuenta:</span> <span className="font-semibold">{emailHint}</span>
                </div>
            )}

            {/* Code */}
            <div className="flex flex-col gap-1.5">
                <Input
                    label="Código de seguridad de 6 dígitos"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    error={errors.code?.message}
                    {...register("code")}
                />
                <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-xs font-medium transition-colors"
                        style={{ color: "var(--color-text-brand)" }}
                        onMouseOver={(e) => e.currentTarget.style.color = "var(--color-brand-stronger)"}
                        onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-brand)"}>
                        ¿No recibiste el código?
                    </Link>
                </div>
            </div>

            {/* Nuevas Contraseñas */}
            <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Input
                    label="Nueva contraseña"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 caracteres, 1 mayús., 1 núm."
                    leadingIcon={<LockIcon />}
                    trailingIcon={
                        <button type="button" onClick={() => setShowPassword((p) => !p)}
                            className="pointer-events-auto transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                            onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-secondary)"}
                            onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-tertiary)"}
                            aria-label={showPassword ? "Ocultar" : "Mostrar"}>
                            <EyeIcon show={showPassword} />
                        </button>
                    }
                    error={errors.password?.message}
                    {...register("password")}
                />

                <Input
                    label="Confirmar contraseña nueva"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repita la contraseña"
                    leadingIcon={<LockIcon />}
                    trailingIcon={
                        <button type="button" onClick={() => setShowConfirmPassword((p) => !p)}
                            className="pointer-events-auto transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                            onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-secondary)"}
                            onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-tertiary)"}
                            aria-label={showConfirmPassword ? "Ocultar" : "Mostrar"}>
                            <EyeIcon show={showConfirmPassword} />
                        </button>
                    }
                    error={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                />
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-3 mt-4">
                <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
                    Guardar nueva contraseña
                </Button>

                <Link href="/login" className="text-sm font-medium text-center hover:underline transition-colors py-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Cancelar y volver al login
                </Link>
            </div>
        </form>
    );
}
