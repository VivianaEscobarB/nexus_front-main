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
import { Input, Select, Button, Card, CardBody } from "@/components/ui";

function ArrowLeftIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
}

const createClientSchema = z.object({
    // Client Info
    document_type: z.enum(["NIT", "CC", "CE", "PASSPORT"], { message: "Seleccione un tipo de documento" }),
    document_number: z.string().min(5, "El número de documento debe tener al menos 5 caracteres"),
    business_name: z.string().min(2, "La razón social o nombre de empresa es obligatorio"),
    phone: z.string().min(7, "El teléfono debe ser válido"),
    address: z.string().min(5, "La dirección es obligatoria"),

    // User Account Info
    first_name: z.string().min(2, "El nombre del contacto debe tener al menos 2 caracteres"),
    last_name: z.string().min(2, "Los apellidos del contacto deben tener al menos 2 caracteres"),
    email: z.string().email("Debe ser un correo electrónico válido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),

    // Hidden/Default Fields
    role: z.literal("CLIENT"),
    status: z.literal("ACTIVE"),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

export default function CreateClientPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset
    } = useForm<CreateClientFormData>({
        resolver: zodResolver(createClientSchema),
        mode: "onChange",
        defaultValues: {
            document_type: "NIT",
            document_number: "",
            business_name: "",
            phone: "",
            address: "",
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            role: "CLIENT",
            status: "ACTIVE",
        }
    });

    const onSubmit = async (data: CreateClientFormData) => {
        setIsSubmitting(true);
        setSuccessMsg(null);
        try {
            // Mock API Call
            await new Promise(resolve => setTimeout(resolve, 1200));
            console.log("Cliente y Usuario creados:", data);

            setSuccessMsg(`Cliente "${data.business_name}" registrado exitosamente. Las credenciales fueron enviadas a ${data.email}.`);
            reset();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header / Breabcrumb */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-[var(--color-surface-hover)]">
                    <ArrowLeftIcon />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Registrar Nuevo Cliente</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Complete los datos empresariales y de acceso para el nuevo cliente.</p>
                </div>
            </div>

            <Card padding="lg">
                <CardBody>
                    {successMsg && (
                        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)", border: "1px solid var(--color-success-default)" }}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm font-medium">{successMsg}</p>
                        </div>
                    )}
                    <Form onSubmit={handleSubmit(onSubmit)} gap="lg">
                        <FormSection title="Datos Empresariales (Ficha Cliente)" description="Información de facturación y contacto comercial representativo.">
                            <FormRow cols={2}>
                                <Select
                                    label="Tipo de Documento"
                                    options={[
                                        { value: "NIT", label: "NIT (Empresarial)" },
                                        { value: "CC", label: "Cédula de Ciudadanía" },
                                        { value: "CE", label: "Cédula de Extranjería" },
                                        { value: "PASSPORT", label: "Pasaporte" },
                                    ]}
                                    error={errors.document_type?.message}
                                    {...register("document_type")}
                                />
                                <Input
                                    label="Número de Documento"
                                    placeholder="Ej. 900123456-7"
                                    error={errors.document_number?.message}
                                    {...register("document_number")}
                                />
                            </FormRow>
                            <FormRow cols={1}>
                                <Input
                                    label="Razón Social / Entidad Comercial"
                                    placeholder="Ej. Distribuidora NEXUS S.A."
                                    error={errors.business_name?.message}
                                    {...register("business_name")}
                                />
                            </FormRow>
                            <FormRow cols={2}>
                                <Input
                                    label="Teléfono Móvil o Fijo"
                                    placeholder="+57 300 000 00"
                                    error={errors.phone?.message}
                                    {...register("phone")}
                                />
                                <Input
                                    label="Dirección Principal"
                                    placeholder="Cra 12 #34-56, Bodega 5"
                                    error={errors.address?.message}
                                    {...register("address")}
                                />
                            </FormRow>
                        </FormSection>

                        <FormSection title="Credenciales de Plataforma (Usuario)" description="El sistema creará una cuenta de 'Cliente' vinculada automáticamente a esta empresa.">
                            <FormRow cols={2}>
                                <Input
                                    label="Nombre del Representante"
                                    placeholder="Ej. Carlos"
                                    error={errors.first_name?.message}
                                    {...register("first_name")}
                                />
                                <Input
                                    label="Apellidos"
                                    placeholder="Ej. Rodríguez"
                                    error={errors.last_name?.message}
                                    {...register("last_name")}
                                />
                            </FormRow>
                            <FormRow cols={2}>
                                <Input
                                    label="Correo Electrónico (Login)"
                                    type="email"
                                    placeholder="carlos@empresa.com"
                                    error={errors.email?.message}
                                    {...register("email")}
                                />
                                <Input
                                    label="Asignar Contraseña Inicial"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    error={errors.password?.message}
                                    {...register("password")}
                                />
                            </FormRow>
                        </FormSection>

                        <FormActions align="between">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isValid || isSubmitting}>
                                {isSubmitting ? "Registrando Cliente..." : "Registrar Cliente y Usuario"}
                            </Button>
                        </FormActions>
                    </Form>
                </CardBody>
            </Card>
        </div>
    );
}
