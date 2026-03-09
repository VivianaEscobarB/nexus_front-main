"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormActions, FormRow, FormSection } from "@/components/ui/Form";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { createClient } from "@/modules/clients";
import { UserRole } from "@/types";

function ArrowLeftIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
}

const createClientSchema = z.object({
    documentType: z.enum(["NIT", "CC", "CE", "PASSPORT"], {
        message: "Seleccione un tipo de documento",
    }),
    documentNumber: z
        .string()
        .min(5, "El numero de documento debe tener al menos 5 caracteres"),
    businessName: z
        .string()
        .min(2, "La razon social o nombre de empresa es obligatorio"),
    name: z
        .string()
        .min(2, "El nombre del contacto debe tener al menos 2 caracteres"),
    email: z.string().email("Debe ser un correo electronico valido"),
    phone: z.string().min(7, "El telefono debe ser valido"),
    address: z.string().min(5, "La direccion es obligatoria"),
    requiresPortalAccess: z.boolean(),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible registrar el cliente.";
}

export default function CreateClientPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<CreateClientFormData>({
        resolver: zodResolver(createClientSchema),
        mode: "onChange",
        defaultValues: {
            documentType: "NIT",
            documentNumber: "",
            businessName: "",
            name: "",
            email: "",
            phone: "",
            address: "",
            requiresPortalAccess: false,
        },
    });

    const onSubmit = async (data: CreateClientFormData) => {
        setIsSubmitting(true);
        setSuccessMsg(null);
        setErrorMsg(null);

        try {
            const client = await createClient({
                name: data.name,
                email: data.email,
                phone: data.phone,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                businessName: data.businessName,
                address: data.address,
                status: "ACTIVE",
            });

            setSuccessMsg(
                data.requiresPortalAccess
                    ? `Cliente "${client.businessName}" registrado. La cuenta del portal debe ser creada luego por un ADMIN como usuario CLIENT asociado.`
                    : `Cliente "${client.businessName}" registrado correctamente en el directorio comercial.`
            );
            reset();
        } catch (error) {
            setErrorMsg(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-[var(--color-surface-hover)]"
                    >
                        <ArrowLeftIcon />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Registrar nuevo cliente
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Crea la ficha comercial del cliente. El acceso al portal se gestiona despues desde Administracion.
                        </p>
                    </div>
                </div>

                <Card padding="lg">
                    <CardBody>
                        {successMsg ? (
                            <div className="mb-6 rounded-lg border border-[var(--color-success-default)] bg-[var(--color-success-subtle)] p-4 text-sm font-medium text-[var(--color-success-strong)]">
                                {successMsg}
                            </div>
                        ) : null}

                        {errorMsg ? (
                            <div className="mb-6 rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-4 text-sm font-medium text-[var(--color-danger-strong)]">
                                {errorMsg}
                            </div>
                        ) : null}

                        <Form onSubmit={handleSubmit(onSubmit)} gap="lg">
                            <FormSection
                                title="Datos comerciales del cliente"
                                description="Informacion base para crear el registro en la entidad client."
                            >
                                <FormRow cols={2}>
                                    <Select
                                        label="Tipo de documento"
                                        options={[
                                            { value: "NIT", label: "NIT" },
                                            { value: "CC", label: "Cedula de ciudadania" },
                                            { value: "CE", label: "Cedula de extranjeria" },
                                            { value: "PASSPORT", label: "Pasaporte" },
                                        ]}
                                        error={errors.documentType?.message}
                                        {...register("documentType")}
                                    />
                                    <Input
                                        label="Numero de documento"
                                        placeholder="Ej. 900123456-7"
                                        error={errors.documentNumber?.message}
                                        {...register("documentNumber")}
                                    />
                                </FormRow>

                                <FormRow cols={2}>
                                    <Input
                                        label="Nombre de contacto"
                                        placeholder="Ej. Juan Perez"
                                        error={errors.name?.message}
                                        {...register("name")}
                                    />
                                    <Input
                                        label="Correo principal"
                                        type="email"
                                        placeholder="contacto@empresa.com"
                                        error={errors.email?.message}
                                        {...register("email")}
                                    />
                                </FormRow>

                                <FormRow cols={2}>
                                    <Input
                                        label="Empresa / razon social"
                                        placeholder="Ej. Importaciones JP"
                                        error={errors.businessName?.message}
                                        {...register("businessName")}
                                    />
                                    <Input
                                        label="Telefono"
                                        placeholder="+57 300 000 0000"
                                        error={errors.phone?.message}
                                        {...register("phone")}
                                    />
                                </FormRow>

                                <FormRow cols={1}>
                                    <Input
                                        label="Direccion"
                                        placeholder="Cra 12 #34-56, Bodega 5"
                                        error={errors.address?.message}
                                        {...register("address")}
                                    />
                                </FormRow>
                            </FormSection>

                            <FormSection
                                title="Acceso al portal cliente"
                                description="El agente comercial no crea usuarios. Si el cliente requiere acceso, Administracion debe crear despues un usuario CLIENT asociado."
                            >
                                <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] px-4 py-4 text-sm text-[var(--color-text-primary)]">
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-primary-default)]"
                                        {...register("requiresPortalAccess")}
                                    />
                                    <span>
                                        Solicitar acceso al portal cliente
                                        <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                                            El registro comercial se crea ahora. La cuenta de acceso debe ser creada luego por un ADMIN y asociada al `client_id`.
                                        </span>
                                    </span>
                                </label>
                            </FormSection>

                            <FormActions align="between">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    disabled={!isValid || isSubmitting}
                                >
                                    {isSubmitting ? "Registrando cliente..." : "Registrar cliente"}
                                </Button>
                            </FormActions>
                        </Form>
                    </CardBody>
                </Card>
            </div>
        </RoleGuard>
    );
}
