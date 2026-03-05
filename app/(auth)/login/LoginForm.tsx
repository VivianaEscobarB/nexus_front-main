"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
// ---------------------------------------------------------------------------
// Schema de validación
// ---------------------------------------------------------------------------

const loginSchema = z.object({
    email: z
        .string()
        .min(1, "El correo es requerido")
        .email("Ingresa un correo válido"),
    password: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Íconos inline (sin dependencia de librería)
// ---------------------------------------------------------------------------

function MailIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4" aria-hidden="true">
            <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
            <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
        </svg>
    );
}

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
            <path
                d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Componente de formulario de login (lógica separada del layout)
// ---------------------------------------------------------------------------

export function LoginForm() {
    const { signIn, isSigningIn } = useAuth();
    const [showPassword, setShowPassword] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } =
        useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

    async function onSubmit(values: LoginFormValues) {
        setServerError(null);
        try {
            await signIn(values);
        } catch {
            setServerError("Credenciales incorrectas. Verifica tu correo y contraseña.");
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

            {/* Error del servidor */}
            {serverError && (
                <div role="alert"
                    className="flex items-start gap-2.5 rounded-lg bg-danger-subtle border border-danger-default/20 px-4 py-3 text-sm text-danger-text">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 16 16"
                        fill="currentColor" aria-hidden="true">
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                    </svg>
                    {serverError}
                </div>
            )}

            {/* Email */}
            <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@empresa.com"
                autoComplete="email"
                leadingIcon={<MailIcon />}
                error={errors.email?.message}
                {...register("email")}
            />

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
                <Input
                    label="Contraseña"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    leadingIcon={<LockIcon />}
                    trailingIcon={
                        <button type="button" onClick={() => setShowPassword((p) => !p)}
                            className="pointer-events-auto text-text-tertiary hover:text-text-secondary transition-colors"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                            <EyeIcon show={showPassword} />
                        </button>
                    }
                    error={errors.password?.message}
                    {...register("password")}
                />
                <div className="flex justify-end">
                    <a href="/forgot-password" className="text-xs font-medium text-text-brand hover:text-brand-stronger transition-colors">
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>
            </div>
            {/* Submit */}
            <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isSigningIn}>
                Iniciar sesión
            </Button>
        </form>
    );
}

