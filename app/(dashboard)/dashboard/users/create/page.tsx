"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
    Form,
    FormSection,
    FormRow,
    FormActions,
} from "@/components/ui/Form";
import { Input, Select, Button, Card, CardHeader, CardBody } from "@/components/ui";

// Icon for back button
function ArrowLeftIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
}

const createUserSchema = z.object({
    first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    last_name: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres"),
    email: z.string().email("Debe ser un correo electrónico válido"),
    role: z.string().min(1, "Debe seleccionar un rol"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    status: z.enum(["ACTIVE", "INACTIVE"], { message: "Debe seleccionar un estado" }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function CreateUserPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset
    } = useForm<CreateUserFormData>({
        resolver: zodResolver(createUserSchema),
        mode: "onChange",
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            role: "OPERATOR",
            password: "",
            status: "ACTIVE",
        }
    });

    const onSubmit = async (data: CreateUserFormData) => {
        setIsSubmitting(true);
        setSuccessMsg(null);
        try {
            // Mock API Call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("Usuario creado:", data);

            setSuccessMsg(`Usuario ${data.first_name} ${data.last_name} creado exitosamente.`);
            reset();

            // Opcional: redirigir después de un tiempo
            // setTimeout(() => router.push("/dashboard"), 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header / Breabcrumb */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-[var(--color-surface-hover)]">
                    <ArrowLeftIcon />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Nuevo Usuario</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Complete los datos para registrar un nuevo integrante del equipo.</p>
                </div>
            </div>

            <Card padding="lg">
                <CardBody>
                    {successMsg && (
                        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)", border: "1px solid var(--color-success-default)" }}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm font-medium">{successMsg}</p>
                        </div>
                    )}
                    <Form onSubmit={handleSubmit(onSubmit)} gap="lg">
                        <FormSection title="Información Personal" description="Datos básicos del nuevo usuario.">
                            <FormRow cols={2}>
                                <Input
                                    label="Nombre(s)"
                                    placeholder="Ej. Juan Carlos"
                                    error={errors.first_name?.message}
                                    {...register("first_name")}
                                />
                                <Input
                                    label="Apellidos"
                                    placeholder="Ej. Pérez Gómez"
                                    error={errors.last_name?.message}
                                    {...register("last_name")}
                                />
                            </FormRow>
                        </FormSection>

                        <FormSection title="Credenciales y Acceso" description="Configuración de la cuenta y permisos en el sistema.">
                            <FormRow cols={2}>
                                <Input
                                    label="Correo electrónico"
                                    type="email"
                                    placeholder="usuario@empresa.com"
                                    error={errors.email?.message}
                                    {...register("email")}
                                />
                                <Input
                                    label="Contraseña inicial"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    error={errors.password?.message}
                                    {...register("password")}
                                />
                            </FormRow>
                            <FormRow cols={2}>
                                <Select
                                    label="Rol del Sistema"
                                    options={[
                                        { value: "ADMIN", label: "Administrador" },
                                        { value: "WAREHOUSE_MANAGER", label: "Jefe de Bodega" },
                                        { value: "OPERATOR", label: "Operador de Bodega" },
                                        { value: "CLIENT", label: "Cliente Externo" },
                                    ]}
                                    error={errors.role?.message}
                                    {...register("role")}
                                />
                                <Select
                                    label="Estado de la Cuenta"
                                    options={[
                                        { value: "ACTIVE", label: "Activo" },
                                        { value: "INACTIVE", label: "Inactivo / Suspendido" },
                                    ]}
                                    error={errors.status?.message}
                                    {...register("status")}
                                />
                            </FormRow>
                        </FormSection>

                        <FormActions align="between">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isValid || isSubmitting}>
                                {isSubmitting ? "Creando..." : "Crear Usuario"}
                            </Button>
                        </FormActions>
                    </Form>
                </CardBody>
            </Card>
        </div>
    );
}
