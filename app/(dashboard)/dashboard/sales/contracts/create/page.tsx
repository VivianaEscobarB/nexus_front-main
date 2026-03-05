"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { Form, FormSection, FormRow, FormActions } from "@/components/ui/Form";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

function CheckIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
}

// ----------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------
const MOCK_CLIENTS = [
    { client_id: "C1", business_name: "Distribuidora NEXUS S.A.", document_number: "900123456-7" },
    { client_id: "C2", business_name: "Importaciones Globales", document_number: "800987654-3" },
    { client_id: "C3", business_name: "Textiles del Norte", document_number: "901234567-1" },
];

const WAREHOUSE_TYPES = [
    { id: "T1", name: "Alimentos (Refrigerado)" },
    { id: "T2", name: "Textil / Seco" },
    { id: "T3", name: "Industrial / Maquinaria" },
];

const MOCK_BODEGAS = [
    { warehouse_id: "B001", name: "Nave Alimentos Principal", available_capacity_m2: 250, type_id: "T1" },
    { warehouse_id: "B002", name: "Nave Secos B", available_capacity_m2: 800, type_id: "T2" },
    { warehouse_id: "B004", name: "Almacén Industrial", available_capacity_m2: 1500, type_id: "T3" },
];

// Schema
const contractSchema = z.object({
    client_id: z.string().min(1, "Debe seleccionar un cliente"),
    warehouse_type_id: z.string().min(1, "Debe seleccionar la clasificación de carga"),
    warehouse_id: z.string().min(1, "Debe seleccionar un espacio disponible"),
    required_area_m2: z.number().min(10, "El área mínima a arrendar son 10 m²"),
    duration_months: z.number().min(1, "Debe arrendar por al menos 1 mes"),
    include_basic_services: z.boolean().refine(val => val === true, {
        message: "Los servicios básicos de operación son obligatorios (Regla RF-01)"
    })
});

type ContractForm = z.infer<typeof contractSchema>;

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

    // Find preselected warehouse to set its type automatically
    const preselectedWh = MOCK_BODEGAS.find(w => w.warehouse_id === preselectedWarehouseId);

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isValid }
    } = useForm<ContractForm>({
        resolver: zodResolver(contractSchema),
        mode: "onChange",
        defaultValues: {
            client_id: "",
            warehouse_type_id: preselectedWh?.type_id || "",
            warehouse_id: preselectedWh?.warehouse_id || "",
            required_area_m2: 10,
            duration_months: 1,
            include_basic_services: true
        }
    });

    const watchType = watch("warehouse_type_id");
    const watchWarehouseId = watch("warehouse_id");
    const watchArea = watch("required_area_m2");

    const availableBodegasForType = MOCK_BODEGAS.filter(b => b.type_id === watchType);
    const selectedBodegaInfo = MOCK_BODEGAS.find(b => b.warehouse_id === watchWarehouseId);

    // Capacity Validation Regla (4.2.3-RF03)
    const hasEnoughCapacity = selectedBodegaInfo ? selectedBodegaInfo.available_capacity_m2 >= watchArea : true;

    // Reset warehouse selection if type changes
    useEffect(() => {
        if (watchType && selectedBodegaInfo?.type_id !== watchType) {
            setValue("warehouse_id", "");
        }
    }, [watchType]);

    const onSubmit = async (data: ContractForm) => {
        if (!hasEnoughCapacity) return;

        setIsSubmitting(true);
        try {
            // Mock API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log("Contrato generado:", data);

            // Redirect to Checkout/Payment Gateway Simulation
            router.push(`/dashboard/sales/checkout?contract_id=TEMP123&amount=${data.required_area_m2 * 15}&client=${data.client_id}`);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Generación de Contrato Comercial</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Siga el asistente para formalizar la oferta y separar la bodega para el cliente.</p>
            </div>

            {/* Stepper Visual */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[var(--color-border-subtle)] z-0 rounded-full"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary-default)] z-0 rounded-full transition-all duration-500" style={{ width: step === 1 ? '0%' : '100%' }}></div>

                {[1, 2].map((s) => (
                    <div key={s} className={`relative z-10 flex flex-col items-center gap-2 ${step >= s ? 'text-[var(--color-primary-default)]' : 'text-[var(--color-text-secondary)]'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= s ? 'bg-[var(--color-surface-base)] border-[var(--color-primary-default)] text-[var(--color-primary-default)]' : 'bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)]'}`}>
                            {step > s ? <CheckIcon /> : s}
                        </div>
                        <span className="text-xs font-semibold uppercase">{s === 1 ? 'Datos de Cliente' : 'Oferta y Capacidades'}</span>
                    </div>
                ))}
            </div>

            <Card padding="lg">
                <CardBody>
                    <Form onSubmit={handleSubmit(onSubmit)} gap="lg">

                        {step === 1 && (
                            <FormSection title="1. Selección de Prospecto/Cliente" description="Elija o busque el cliente con el que se formalizará el contrato.">
                                <FormRow cols={1}>
                                    <Select
                                        label="Cliente Registrado"
                                        options={[
                                            { value: "", label: "Seleccione un cliente..." },
                                            ...MOCK_CLIENTS.map(c => ({ value: c.client_id, label: `${c.business_name} (NIT: ${c.document_number})` }))
                                        ]}
                                        error={errors.client_id?.message}
                                        {...register("client_id")}
                                    />
                                </FormRow>
                                <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex justify-end">
                                    <Button type="button" variant="primary" onClick={() => setStep(2)} disabled={!watch("client_id")}>
                                        Siguiente Paso →
                                    </Button>
                                </div>
                            </FormSection>
                        )}


                        {step === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                                <FormSection title="2. Definición del Almacenamiento" description="Valide la compatibilidad de carga y la capacidad requerida.">
                                    <FormRow cols={2}>
                                        <Select
                                            label="Clasificación de Carga Permitida"
                                            options={[
                                                { value: "", label: "Seleccione clasificación..." },
                                                ...WAREHOUSE_TYPES.map(t => ({ value: t.id, label: t.name }))
                                            ]}
                                            error={errors.warehouse_type_id?.message}
                                            {...register("warehouse_type_id")}
                                        />
                                        <Select
                                            label="Ubicación (Bodega Real)"
                                            options={[
                                                { value: "", label: watchType ? "Seleccione nave disponible..." : "Primero seleccione tipo carga" },
                                                ...availableBodegasForType.map(b => ({ value: b.warehouse_id, label: `${b.name} (Disp: ${b.available_capacity_m2}m²)` }))
                                            ]}
                                            disabled={!watchType}
                                            error={errors.warehouse_id?.message}
                                            {...register("warehouse_id")}
                                        />
                                    </FormRow>

                                    {selectedBodegaInfo && (
                                        <div className="my-4 p-4 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <Input
                                                        label="Área Mínima a Arrendar (m²)"
                                                        type="number"
                                                        {...register("required_area_m2", { valueAsNumber: true })}
                                                        error={errors.required_area_m2?.message}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        label="Duración (Meses)"
                                                        type="number"
                                                        {...register("duration_months", { valueAsNumber: true })}
                                                        error={errors.duration_months?.message}
                                                    />
                                                </div>
                                            </div>

                                            {/* Capacity Evaluator Rule */}
                                            <div className={`mt-4 p-3 rounded-lg border text-sm flex gap-3 ${hasEnoughCapacity ? 'bg-[var(--color-success-subtle)] border-[var(--color-success-default)]/30 text-[var(--color-success-strong)]' : 'bg-[var(--color-danger-subtle)] border-[var(--color-danger-default)]/30 text-[var(--color-danger-strong)]'}`}>
                                                <div className="pt-0.5">
                                                    {hasEnoughCapacity ? <CheckIcon /> : (
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <strong className="block mb-1">{hasEnoughCapacity ? "Capacidad Aprobada" : "Alerta de Capacidad Faltante"}</strong>
                                                    {hasEnoughCapacity
                                                        ? `La bodega seleccionada tiene ${selectedBodegaInfo.available_capacity_m2} m² libres. El área requerida es válida.`
                                                        : `¡Error! El contrato exige ${watchArea} m², pero la bodega solo dispone físicamente de ${selectedBodegaInfo.available_capacity_m2} m².`
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                <FormSection title="3. Servicios y Facturación" description="El contrato incluirá por defecto los paquetes de mantenimiento y seguridad (Normativa interna).">
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
                                            <label htmlFor="services_pack" className="font-semibold text-[var(--color-primary-default)]">Incluir Servicios Básicos de Operación (Obligatorio)</label>
                                            <p className="text-sm text-[var(--color-primary-default)] opacity-80 mt-1">Aplica cobro paramétrico por personal de aseo, seguridad 24/7 y servicios públicos para pasillos comunes según el metraje (m²) arrendado.</p>
                                            {errors.include_basic_services && (
                                                <p className="text-sm text-[var(--color-danger-strong)] mt-2 font-medium">{errors.include_basic_services.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </FormSection>

                                <FormActions align="between" className="pt-6 border-t border-[var(--color-border-subtle)] mt-6">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                        ← Volver
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={isSubmitting}
                                        disabled={!isValid || !hasEnoughCapacity || isSubmitting}
                                    >
                                        Generar Contrato y Cobrar →
                                    </Button>
                                </FormActions>
                            </div>
                        )}
                    </Form>
                </CardBody>
            </Card>
        </div>
    );
}

