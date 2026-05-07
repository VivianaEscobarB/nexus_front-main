"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { activateAccount } from "@/services/auth.service";
import { isApiError } from "@/shared/api/apiError";

const INVALID_TOKEN_MESSAGE = "El enlace no es válido o ha expirado.";
const MISSING_TOKEN_MESSAGE =
    "Este enlace de activación está incompleto o ya no es válido.";
const GENERIC_ERROR_MESSAGE =
    "No fue posible activar tu cuenta. Intenta nuevamente.";

const activateAccountSchema = z
    .object({
        password: z
            .string()
            .min(8, "Al menos 8 caracteres requeridos")
            .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
            .regex(/[0-9]/, "Debe incluir al menos un número")
            .regex(
                /[^A-Za-z0-9]/,
                "Debe incluir al menos un carácter especial"
            ),
        confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

type ActivateAccountFormValues = z.infer<typeof activateAccountSchema>;

function LockIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function EyeIcon({ show }: { show: boolean }) {
    return show ? (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
        >
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path
                fillRule="evenodd"
                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                clipRule="evenodd"
            />
        </svg>
    ) : (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
                clipRule="evenodd"
            />
            <path d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
        </svg>
    );
}

function CheckCircleLgIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
        </svg>
    );
}

function isTokenMessage(message: string): boolean {
    return /(token|enlace|link)/i.test(message);
}

function isInvalidOrExpiredMessage(message: string): boolean {
    return /invalid|not valid|expired|expir|inválid|invalido|vencid/i.test(
        message
    );
}

function isInvalidTokenError(error: unknown): boolean {
    if (!isApiError(error)) {
        return false;
    }

    if (error.status === 404 || error.status === 410) {
        return true;
    }

    const message = error.message.trim();
    if (isTokenMessage(message) && isInvalidOrExpiredMessage(message)) {
        return true;
    }

    return error.status === 400 && !extractPasswordValidationMessage(error);
}

function extractPasswordValidationMessage(error: unknown): string | null {
    if (!isApiError(error)) {
        return null;
    }

    const message = error.message.trim();
    const fieldMatch = message.match(/password\s*:\s*(.+)$/i);

    if (fieldMatch?.[1]) {
        return fieldMatch[1].trim();
    }

    if (/password|contraseña|contrasena/i.test(message) && !isTokenMessage(message)) {
        return message;
    }

    return null;
}

function getErrorMessage(error: unknown): string {
    if (isInvalidTokenError(error)) {
        return INVALID_TOKEN_MESSAGE;
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return GENERIC_ERROR_MESSAGE;
}

export function ActivateAccountForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshSession } = useAuth();
    const activationToken = searchParams.get("token")?.trim() ?? "";

    const [isLoading, setIsLoading] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<ActivateAccountFormValues>({
        resolver: zodResolver(activateAccountSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: ActivateAccountFormValues) {
        clearErrors();
        setServerError(null);

        if (!activationToken) {
            setServerError(MISSING_TOKEN_MESSAGE);
            return;
        }

        setIsLoading(true);
        let shouldStopLoading = true;

        try {
            await activateAccount({
                token: activationToken,
                password: values.password,
            });
            setSuccess(true);

            let hasActiveSession = false;

            try {
                const authenticatedUser = await refreshSession();
                hasActiveSession = Boolean(authenticatedUser);
            } catch {
                hasActiveSession = false;
            }

            shouldStopLoading = false;
            router.push(hasActiveSession ? "/dashboard" : "/login");
        } catch (error) {
            const passwordValidationMessage =
                extractPasswordValidationMessage(error);

            if (passwordValidationMessage) {
                setError("password", {
                    type: "server",
                    message: passwordValidationMessage,
                });
                return;
            }

            if (isInvalidTokenError(error)) {
                setServerError(INVALID_TOKEN_MESSAGE);
                return;
            }

            setServerError(getErrorMessage(error));
        } finally {
            if (shouldStopLoading) {
                setIsLoading(false);
            }
        }
    }

    if (!activationToken) {
        return (
            <div className="flex flex-col gap-5">
                <Alert variant="danger" className="flex items-start gap-2.5 rounded-lg">
                    <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                    </svg>
                    {MISSING_TOKEN_MESSAGE}
                </Alert>

                <Link
                    href="/login"
                    className="text-sm font-medium text-center transition-colors hover:underline"
                    style={{ color: "var(--color-text-tertiary)" }}
                >
                    Volver al inicio de sesión
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-2 animate-in fade-in zoom-in duration-300">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{
                        background: "var(--color-success-subtle)",
                        color: "var(--color-success-strong)",
                    }}
                >
                    <CheckCircleLgIcon />
                </div>
                <h3
                    className="text-xl font-bold tracking-tight mb-2"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    Cuenta activada correctamente. Bienvenido.
                </h3>
                <p
                    className="text-sm mb-6"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    Estamos validando tu sesión y redirigiéndote al dashboard.
                </p>
                <div className="w-full flex">
                    <Button
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                        disabled={isLoading}
                        onClick={() => router.push("/dashboard")}
                    >
                        Ir al dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError ? (
                <Alert variant="danger" className="flex items-start gap-2.5 rounded-lg">
                    <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                    </svg>
                    {serverError}
                </Alert>
            ) : null}

            <div className="flex flex-col gap-4">
                <Input
                    label="Nueva contraseña"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 caracteres, 1 mayús., 1 núm., 1 especial"
                    leadingIcon={<LockIcon />}
                    trailingIcon={
                        <button
                            type="button"
                            onClick={() => setShowPassword((previous) => !previous)}
                            className="pointer-events-auto transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                            onMouseOver={(event) => {
                                event.currentTarget.style.color =
                                    "var(--color-text-secondary)";
                            }}
                            onMouseOut={(event) => {
                                event.currentTarget.style.color =
                                    "var(--color-text-tertiary)";
                            }}
                            aria-label={showPassword ? "Ocultar" : "Mostrar"}
                        >
                            <EyeIcon show={showPassword} />
                        </button>
                    }
                    disabled={isLoading}
                    error={errors.password?.message}
                    {...register("password")}
                />

                <Input
                    label="Confirmar nueva contraseña"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    leadingIcon={<LockIcon />}
                    trailingIcon={
                        <button
                            type="button"
                            onClick={() =>
                                setShowConfirmPassword((previous) => !previous)
                            }
                            className="pointer-events-auto transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                            onMouseOver={(event) => {
                                event.currentTarget.style.color =
                                    "var(--color-text-secondary)";
                            }}
                            onMouseOut={(event) => {
                                event.currentTarget.style.color =
                                    "var(--color-text-tertiary)";
                            }}
                            aria-label={
                                showConfirmPassword ? "Ocultar" : "Mostrar"
                            }
                        >
                            <EyeIcon show={showConfirmPassword} />
                        </button>
                    }
                    disabled={isLoading}
                    error={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                />
            </div>

            <div className="flex flex-col gap-3 mt-4">
                <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                >
                    Activar cuenta
                </Button>

                <Link
                    href="/login"
                    className="text-sm font-medium text-center hover:underline transition-colors py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                >
                    Cancelar y volver al login
                </Link>
            </div>
        </form>
    );
}
