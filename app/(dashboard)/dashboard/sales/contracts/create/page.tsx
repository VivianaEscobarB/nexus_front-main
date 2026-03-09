"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { Form, FormActions, FormRow, FormSection } from "@/components/ui/Form";
import { RoleGuard } from "@/modules/auth";
import { listClients } from "@/modules/clients";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import type { ManagedClient } from "@/modules/clients";
import { UserRole } from "@/types";

function CheckIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
}

const WAREHOUSE_TYPES = [
    { id: "T1", name: "Alimentos (Refrigerado)" },
    { id: "T2", name: "Textil / Seco" },
    { id: "T3", name: "Industrial / Maquinaria" },
];

const MOCK_BODEGAS = [
    { warehouse_id: "B001", name: "Nave Alimentos Principal", available_capacity_m2: 250, type_id: "T1" },
    { warehouse_id: "B002", name: "Nave Secos B", available_capacity_m2: 800, type_id: "T2" },
    { warehouse_id: "B004", name: "Almacen Industrial", available_capacity_m2: 1500, type_id: "T3" },
];

const contractSchema = z.object({
    client_id: z.string().min(1, "Debe seleccionar un cliente"),
    warehouse_type_id: z.string().min(1, "Debe seleccionar la clasificacion de carga"),
    warehouse_id: z.string().min(1, "Debe seleccionar un espacio disponible"),
    required_area_m2: z.number().min(10, "El area minima a arrendar son 10 m2"),
    duration_months: z.number().min(1, "Debe arrendar por al menos 1 mes"),
    include_basic_services: z.boolean().refine((value) => value === true, {
        message: "Los servicios basicos de operacion son obligatorios",
    }),
});

type ContractForm = z.infer<typeof contractSchema>;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible cargar los clientes.";
}

export default function CreateContractPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-secondary)]">Cargando formulario...</div>}>
            <ContractFormContent />
        </Suspense>
    );
}

function ContractFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedWarehouseId = searchParams.get("warehouse_id");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [clients, setClients] = useState<ManagedClient[]>([]);
    const [clientsError, setClientsError] = useState<string | null>(null);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    const preselectedWarehouse = MOCK_BODEGAS.find(
        (warehouse) => warehouse.warehouse_id === preselectedWarehouseId
    );

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<ContractForm>({
        resolver: zodResolver(contractSchema),
        mode: "onChange",
        defaultValues: {
            client_id: "",
            warehouse_type_id: preselectedWarehouse?.type_id || "",
            warehouse_id: preselectedWarehouse?.warehouse_id || "",
            required_area_m2: 10,
            duration_months: 1,
            include_basic_services: true,
        },
    });

    const watchType = watch("warehouse_type_id");
    const watchWarehouseId = watch("warehouse_id");
    const watchArea = watch("required_area_m2");

    const availableBodegasForType = MOCK_BODEGAS.filter(
        (warehouse) => warehouse.type_id === watchType
    );
    const selectedBodegaInfo = MOCK_BODEGAS.find(
        (warehouse) => warehouse.warehouse_id === watchWarehouseId
    );
    const hasEnoughCapacity = selectedBodegaInfo
        ? selectedBodegaInfo.available_capacity_m2 >= watchArea
        : true;

    useEffect(() => {
        if (watchType && selectedBodegaInfo?.type_id !== watchType) {
            setValue("warehouse_id", "");
        }
    }, [selectedBodegaInfo, setValue, watchType]);

    useEffect(() => {
        let isMounted = true;

        async function loadClientsData() {
            setIsLoadingClients(true);
            setClientsError(null);

            try {
                const data = await listClients();
                if (isMounted) {
                    setClients(data);
                }
            } catch (error) {
                if (isMounted) {
                    setClientsError(getErrorMessage(error));
                }
            } finally {
                if (isMounted) {
                    setIsLoadingClients(false);
                }
            }
        }

        loadClientsData();

        return () => {
            isMounted = false;
        };
    }, []);

    const onSubmit = async (data: ContractForm) => {
        if (!hasEnoughCapacity) {
            return;
        }

        setIsSubmitting(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            router.push(
                `/dashboard/sales/checkout?contract_id=TEMP123&amount=${data.required_area_m2 * 15}&client=${data.client_id}`
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                        Generacion de contrato comercial
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Sigue el asistente para formalizar la oferta y separar la bodega para el cliente.
                    </p>
                </div>

                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[var(--color-border-subtle)] z-0 rounded-full" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary-default)] z-0 rounded-full transition-all duration-500"
                        style={{ width: step === 1 ? "0%" : "100%" }}
                    />

                    {[1, 2].map((currentStep) => (
                        <div
                            key={currentStep}
                            className={`relative z-10 flex flex-col items-center gap-2 ${step >= currentStep ? "text-[var(--color-primary-default)]" : "text-[var(--color-text-secondary)]"}`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= currentStep ? "bg-[var(--color-surface-base)] border-[var(--color-primary-default)] text-[var(--color-primary-default)]" : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)]"}`}
                            >
                                {step > currentStep ? <CheckIcon /> : currentStep}
                            </div>
                            <span className="text-xs font-semibold uppercase">
                                {currentStep === 1 ? "Datos de cliente" : "Oferta y capacidades"}
                            </span>
                        </div>
                    ))}
                </div>

                {clientsError ? (
                    <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]">
                        {clientsError}
                    </div>
                ) : null}

                <Card padding="lg">
                    <CardBody>
                        <Form onSubmit={handleSubmit(onSubmit)} gap="lg">
                            {step === 1 ? (
                                <FormSection
                                    title="1. Seleccion de prospecto/cliente"
                                    description="Elige el cliente con el que se formalizara el contrato."
                                >
                                    <FormRow cols={1}>
                                        <Select
                                            label="Cliente registrado"
                                            options={[
                                                {
                                                    value: "",
                                                    label: isLoadingClients
                                                        ? "Cargando clientes..."
                                                        : "Seleccione un cliente...",
                                                },
                                                ...clients.map((client) => ({
                                                    value: client.id,
                                                    label: `${client.businessName} (${client.documentNumber || client.email})`,
                                                })),
                                            ]}
                                            disabled={isLoadingClients || clients.length === 0}
                                            error={errors.client_id?.message}
                                            {...register("client_id")}
                                        />
                                    </FormRow>
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex justify-end">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={() => setStep(2)}
                                            disabled={!watch("client_id")}
                                        >
                                            Siguiente paso -&gt;
                                        </Button>
                                    </div>
                                </FormSection>
                            ) : null}

                            {step === 2 ? (
                                <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                                    <FormSection
                                        title="2. Definicion del almacenamiento"
                                        description="Valida la compatibilidad de carga y la capacidad requerida."
                                    >
                                        <FormRow cols={2}>
                                            <Select
                                                label="Clasificacion de carga permitida"
                                                options={[
                                                    { value: "", label: "Seleccione clasificacion..." },
                                                    ...WAREHOUSE_TYPES.map((type) => ({
                                                        value: type.id,
                                                        label: type.name,
                                                    })),
                                                ]}
                                                error={errors.warehouse_type_id?.message}
                                                {...register("warehouse_type_id")}
                                            />
                                            <Select
                                                label="Ubicacion (Bodega real)"
                                                options={[
                                                    {
                                                        value: "",
                                                        label: watchType
                                                            ? "Seleccione nave disponible..."
                                                            : "Primero seleccione tipo de carga",
                                                    },
                                                    ...availableBodegasForType.map((warehouse) => ({
                                                        value: warehouse.warehouse_id,
                                                        label: `${warehouse.name} (Disp: ${warehouse.available_capacity_m2}m2)`,
                                                    })),
                                                ]}
                                                disabled={!watchType}
                                                error={errors.warehouse_id?.message}
                                                {...register("warehouse_id")}
                                            />
                                        </FormRow>

                                        {selectedBodegaInfo ? (
                                            <div className="my-4 p-4 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <Input
                                                            label="Area minima a arrendar (m2)"
                                                            type="number"
                                                            {...register("required_area_m2", {
                                                                valueAsNumber: true,
                                                            })}
                                                            error={errors.required_area_m2?.message}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input
                                                            label="Duracion (Meses)"
                                                            type="number"
                                                            {...register("duration_months", {
                                                                valueAsNumber: true,
                                                            })}
                                                            error={errors.duration_months?.message}
                                                        />
                                                    </div>
                                                </div>

                                                <div
                                                    className={`mt-4 p-3 rounded-lg border text-sm flex gap-3 ${hasEnoughCapacity ? "bg-[var(--color-success-subtle)] border-[var(--color-success-default)]/30 text-[var(--color-success-strong)]" : "bg-[var(--color-danger-subtle)] border-[var(--color-danger-default)]/30 text-[var(--color-danger-strong)]"}`}
                                                >
                                                    <div className="pt-0.5">
                                                        {hasEnoughCapacity ? (
                                                            <CheckIcon />
                                                        ) : (
                                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong className="block mb-1">
                                                            {hasEnoughCapacity ? "Capacidad aprobada" : "Alerta de capacidad faltante"}
                                                        </strong>
                                                        {hasEnoughCapacity
                                                            ? `La bodega seleccionada tiene ${selectedBodegaInfo.available_capacity_m2} m2 libres. El area requerida es valida.`
                                                            : `El contrato exige ${watchArea} m2, pero la bodega solo dispone de ${selectedBodegaInfo.available_capacity_m2} m2.`}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </FormSection>

                                    <FormSection
                                        title="3. Servicios y facturacion"
                                        description="El contrato incluira por defecto los paquetes de mantenimiento y seguridad."
                                    >
                                        <div className="p-4 border border-[var(--color-primary-default)]/30 bg-[var(--color-primary-subtle)] rounded-lg flex items-start gap-3">
                                            <Controller
                                                name="include_basic_services"
                                                control={control}
                                                render={({ field }) => (
                                                    <input
                                                        type="checkbox"
                                                        id="services_pack"
                                                        checked={field.value === true}
                                                        onChange={field.onChange}
                                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[var(--color-primary-default)] focus:ring-[var(--color-primary-default)]"
                                                    />
                                                )}
                                            />
                                            <div>
                                                <label htmlFor="services_pack" className="font-semibold text-[var(--color-primary-default)]">
                                                    Incluir servicios basicos de operacion (Obligatorio)
                                                </label>
                                                <p className="text-sm text-[var(--color-primary-default)] opacity-80 mt-1">
                                                    Aplica cobro parametrico por personal de aseo, seguridad 24/7 y servicios publicos para pasillos comunes segun el metraje arrendado.
                                                </p>
                                                {errors.include_basic_services ? (
                                                    <p className="text-sm text-[var(--color-danger-strong)] mt-2 font-medium">
                                                        {errors.include_basic_services.message}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </FormSection>

                                    <FormActions align="between" className="pt-6 border-t border-[var(--color-border-subtle)] mt-6">
                                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                            &lt;- Volver
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={isSubmitting}
                                            disabled={!isValid || !hasEnoughCapacity || isSubmitting}
                                        >
                                            Generar contrato y cobrar -&gt;
                                        </Button>
                                    </FormActions>
                                </div>
                            ) : null}
                        </Form>
                    </CardBody>
                </Card>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
