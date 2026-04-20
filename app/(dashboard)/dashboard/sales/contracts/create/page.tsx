"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardBody, Select, Input } from "@/components/ui";
import { Form, FormActions, FormRow, FormSection } from "@/components/ui/Form";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { listClients } from "@/modules/clients";
import {
    listRentalUnits,
    validateBulkAvailability,
    createReservation,
    createContract,
    getReservationByToken,
} from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import type { ManagedClient } from "@/modules/clients";
import type { RentalUnit } from "@/modules/sales";
import { UserRole } from "@/types";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        if (error.status === 400) return "Datos inválidos. Verifica fechas, cliente y unidades del contrato.";
        if (error.status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
        if (error.status === 403) return "No tienes permisos para ejecutar este proceso.";
        if (error.status === 404) return "No se encontró la reserva o el recurso solicitado.";
        if (error.status === 409) {
            return (
                "Conflicto de disponibilidad, reserva o precio comercial. " +
                "Si el backend indica precio inactivo o no configurado, un administrador debe actualizar la " +
                "parametrización en /dashboard/sales/commercial-pricing. " +
                (error.message?.trim() ? `Detalle: ${error.message}` : "")
            );
        }
        return error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return "Ocurrió un error inesperado.";
}

function getUnitDisplayName(unit: RentalUnit): string {
    if (unit.warehouse)    return unit.warehouse.name;
    if (unit.sector)       return unit.sector.code;
    if (unit.storageSpace) return unit.storageSpace.code;
    return `Unidad #${unit.id}`;
}

function getEntityLabel(unit: RentalUnit): string {
    const name = unit.entityType?.name?.toUpperCase() ?? "";
    if (name.includes("WAREHOUSE")) return "BODEGA";
    if (name.includes("SECTOR"))    return "SECTOR";
    return "PUESTO";
}

function getDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff > 0 ? Math.ceil(diff / (1000 * 3600 * 24)) : 0;
}

function CheckIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────

const contractSchema = z.object({
    client_id:              z.string().min(1, "Debe seleccionar un prospecto"),
    start_date:             z.string().min(1, "Fecha de inicio obligatoria"),
    end_date:               z.string().min(1, "Fecha de finalización obligatoria"),
    include_basic_services: z
        .boolean()
        .refine(v => v === true, { message: "Los servicios operativos base son obligatorios" }),
});

type ContractForm = z.infer<typeof contractSchema>;

// ─────────────────────────────────────────────────────────────
// WRAPPERS
// ─────────────────────────────────────────────────────────────

export default function CreateContractPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-secondary)]">Cargando asistente...</div>}>
            <ContractFormContent />
        </Suspense>
    );
}

// ─────────────────────────────────────────────────────────────
// FORM (inner)
// ─────────────────────────────────────────────────────────────

function ContractFormContent() {
    const router       = useRouter();
    const searchParams = useSearchParams();

    // URL params (from catalog cart or reservation panel)
    const urlUnits         = searchParams.get("units") || "";
    const urlStart         = searchParams.get("start") || "";
    const urlEnd           = searchParams.get("end")   || "";
    const reservationToken = searchParams.get("token") || null;

    // Data
    const [clients,          setClients]          = useState<ManagedClient[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [cartUnits,        setCartUnits]         = useState<RentalUnit[]>([]);
    const [isLoadingUnits,   setIsLoadingUnits]    = useState(true);

    // UI state
    const [step,         setStep]         = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError,  setSubmitError]  = useState<string | null>(null);
    const [validating,   setValidating]   = useState(false);
    const [validationOk, setValidationOk] = useState<boolean | null>(null);
    const [resolvedUnitIds, setResolvedUnitIds] = useState<number[]>(
        () => (urlUnits ? urlUnits.split(",").map(Number).filter(Boolean) : [])
    );
    const [reservationClientLabel, setReservationClientLabel] = useState<string>("");
    const [reservationClientId, setReservationClientId] = useState<number | null>(null);

    const presetIds = resolvedUnitIds;

    // ── Load clients ────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        listClients()
            .then(data => { if (!cancelled) setClients(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setIsLoadingClients(false); });
        return () => { cancelled = true; };
    }, []);

    // ── Load units from resolved IDs ────────────────────────
    useEffect(() => {
        if (presetIds.length === 0) { setIsLoadingUnits(false); return; }
        let cancelled = false;
        // Fetch all (no date filter needed — we already filtered in catalog)
        listRentalUnits()
            .then(all => {
                if (!cancelled) setCartUnits(all.filter(u => presetIds.includes(u.id)));
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setIsLoadingUnits(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presetIds.join(",")]);

    // ── Form ────────────────────────────────────────────────
    const { register, handleSubmit, control, watch, setValue, formState: { errors, isValid } } = useForm<ContractForm>({
        resolver: zodResolver(contractSchema),
        mode: "onChange",
        defaultValues: {
            client_id:              "",
            start_date:             urlStart,
            end_date:               urlEnd,
            include_basic_services: true,
        },
    });

    const watchStart = watch("start_date");
    const watchEnd   = watch("end_date");
    const totalDays  = getDays(watchStart, watchEnd);
    const isFromReservation = Boolean(reservationToken);

    // ── Resolver unidades + datos heredados de la reserva ───
    useEffect(() => {
        let cancelled = false;
        const fromUrl = urlUnits.split(",").map(Number).filter(n => Number.isFinite(n) && n > 0);
        if (fromUrl.length > 0) {
            setResolvedUnitIds(fromUrl);
            if (!reservationToken) return;
        }
        if (!reservationToken) {
            setResolvedUnitIds([]);
            return;
        }

        getReservationByToken(reservationToken)
            .then((reservation) => {
                if (cancelled) return;
                const fromReservation = reservation.units
                    .map(u => u.rentalUnitId || u.rentalUnit?.id || 0)
                    .filter((id): id is number => Number.isFinite(id) && id > 0);
                if (fromUrl.length === 0) {
                    setResolvedUnitIds(Array.from(new Set(fromReservation)));
                }
                setReservationClientId(reservation.clientId || null);
                const rawClientLabel =
                    reservation.client?.businessName?.trim() ||
                    (reservation.clientId ? `Cliente #${reservation.clientId}` : "");
                setReservationClientLabel(rawClientLabel);
                if (reservation.clientId) {
                    setValue("client_id", String(reservation.clientId), { shouldValidate: true });
                }
                if (reservation.startDate) {
                    setValue("start_date", reservation.startDate, { shouldValidate: true });
                }
                if (reservation.endDate) {
                    setValue("end_date", reservation.endDate, { shouldValidate: true });
                }
            })
            .catch(() => {
                if (!cancelled) setResolvedUnitIds([]);
            });

        return () => { cancelled = true; };
    }, [urlUnits, reservationToken, setValue]);

    const clientOptions = useMemo(() => {
        const base = clients.map(c => ({
            value: c.id,
            label: `${c.businessName} (${c.documentNumber ?? c.email})`,
        }));
        if (!isFromReservation || !reservationClientId) return base;
        const alreadyPresent = base.some(opt => String(opt.value) === String(reservationClientId));
        if (alreadyPresent) return base;
        return [
            {
                value: String(reservationClientId),
                label: reservationClientLabel || `Cliente #${reservationClientId}`,
            },
            ...base,
        ];
    }, [clients, isFromReservation, reservationClientId, reservationClientLabel]);

    // ── Step 1 → 2: validate bulk availability ──────────────
    const handleNextStep = async () => {
        if (isFromReservation) {
            setValidationOk(true);
            setStep(2);
            return;
        }
        if (presetIds.length === 0) { setStep(2); return; }
        setValidating(true);
        setValidationOk(null);
        try {
            const ok = await validateBulkAvailability({
                rentalUnitIds: presetIds,
                startDate:     watchStart,
                endDate:       watchEnd,
            });
            setValidationOk(ok);
            if (ok) setStep(2);
        } catch (err) {
            setValidationOk(false);
            setSubmitError(getApiErrorMessage(err));
        } finally {
            setValidating(false);
        }
    };

    // ── Submit ───────────────────────────────────────────────
    const onSubmit = async (data: ContractForm) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            let contractId: number;

            if (reservationToken) {
                // Flujo: Reserva → Contrato
                const contract = await createContract({
                    reservationToken,
                    startDate: data.start_date,
                    endDate:   data.end_date,
                    contractRentalUnits: cartUnits.map(u => ({
                        rentalUnitId: u.id,
                        startDate:    data.start_date,
                        endDate:      data.end_date,
                        price:        0, // Precio de catálogo (rental_units); el backend aplica el comercial parametrizado
                        status:       1,
                    })),
                });
                contractId = contract.contractId;
            } else {
                // Flujo: Venta directa
                // Primero creamos la reserva temporal para agrupar las unidades
                const reservation = await createReservation({
                    clientId:  Number(data.client_id),
                    startDate: data.start_date,
                    endDate:   data.end_date,
                    units:     presetIds.map(id => ({ rentalUnitId: id })),
                });

                const contract = await createContract({
                    clientId:         Number(data.client_id),
                    reservationToken: reservation.reservationToken,
                    startDate:        data.start_date,
                    endDate:          data.end_date,
                    contractRentalUnits: cartUnits.map(u => ({
                        rentalUnitId: u.id,
                        startDate:    data.start_date,
                        endDate:      data.end_date,
                        price:        0, // Catálogo / parametrización comercial
                        status:       1,
                    })),
                });
                contractId = contract.contractId;
            }

            // Ir al portal de confirmación
            router.push(`/dashboard/sales/checkout/${contractId}`);
        } catch (err) {
            setSubmitError(getApiErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    const steps = ["Prospecto y Periodo", "Revisión Comercial"];

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.SALES_AGENT, UserRole.ADMIN]}>
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Estructurar Contrato Multi-Unidades
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Consolida las unidades del carrito y formaliza el acuerdo comercial.
                        </p>
                        {reservationToken && (
                            <span className="mt-2 inline-block text-xs font-bold bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] px-3 py-1 rounded">
                                Originado desde Reserva: {reservationToken}
                            </span>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-0 relative mb-8">
                        <div className="absolute left-0 top-5 w-full h-1 bg-[var(--color-border-subtle)] rounded-full z-0" />
                        <div
                            className="absolute left-0 top-5 h-1 bg-[var(--color-primary-default)] rounded-full z-0 transition-all duration-500"
                            style={{ width: step === 1 ? "0%" : "100%" }}
                        />
                        {steps.map((label, idx) => {
                            const num = idx + 1;
                            const done = step > num;
                            const active = step === num;
                            return (
                                <div key={num} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors
                                        ${done   ? "bg-[var(--color-primary-default)] border-[var(--color-primary-default)] text-white"
                                        : active ? "bg-[var(--color-surface-base)] border-[var(--color-primary-default)] text-[var(--color-primary-default)]"
                                                 : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"}`}
                                    >
                                        {done ? <CheckIcon /> : num}
                                    </div>
                                    <span className={`text-xs font-semibold uppercase text-center ${active ? "text-[var(--color-primary-default)]" : "text-[var(--color-text-secondary)]"}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <Card padding="lg">
                        <CardBody>
                            <Form onSubmit={handleSubmit(onSubmit)} gap="lg">

                                {/* ── STEP 1 ── */}
                                {step === 1 && (
                                    <FormSection
                                        title={isFromReservation ? "1. Datos heredados de la reserva" : "1. Prospecto y periodo de arrendamiento"}
                                        description={isFromReservation
                                            ? "Estos datos provienen de la reserva seleccionada y no requieren re-selección."
                                            : "Selecciona el prospecto y las fechas exactas del contrato."}
                                    >
                                        {isFromReservation && (
                                            <div className="rounded border border-[var(--color-info-default)] bg-[var(--color-info-subtle)] p-3 text-sm text-[var(--color-info-strong)]">
                                                El contrato se construirá con el mismo cliente y periodo de la reserva para evitar inconsistencias.
                                            </div>
                                        )}
                                        <FormRow cols={1}>
                                            <Select
                                                label="Prospecto / Cliente"
                                                error={errors.client_id?.message}
                                                disabled={isLoadingClients || isFromReservation}
                                                options={[
                                                    { value: "", label: isLoadingClients ? "Cargando prospectos..." : "Seleccione un prospecto..." },
                                                    ...clientOptions,
                                                ]}
                                                {...register("client_id")}
                                            />
                                        </FormRow>
                                        <FormRow cols={2}>
                                            <Input type="date" label="Fecha de inicio" error={errors.start_date?.message} disabled={isFromReservation} {...register("start_date")} />
                                            <Input type="date" label="Fecha de fin"    error={errors.end_date?.message}   disabled={isFromReservation} {...register("end_date")}   />
                                        </FormRow>

                                        {validationOk === false && (
                                            <div role="alert" className="rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger-strong)]">
                                                ⚠ Una o más unidades ya no están disponibles en el período seleccionado. Por favor regresa al catálogo y realiza una nueva selección.
                                            </div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex justify-end gap-3">
                                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                                ← Volver
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="primary"
                                                isLoading={validating}
                                                disabled={!watch("client_id") || !watchStart || !watchEnd || validating}
                                                onClick={handleNextStep}
                                            >
                                                {isFromReservation
                                                    ? "Continuar a Revisión →"
                                                    : validating
                                                      ? "Verificando disponibilidad..."
                                                      : "Validar y Revisar Oferta →"}
                                            </Button>
                                        </div>
                                    </FormSection>
                                )}

                                {/* ── STEP 2 ── */}
                                {step === 2 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">

                                        <div className="rounded-xl border border-[var(--color-info-default)]/40 bg-[var(--color-info-subtle)] p-4 text-sm text-[var(--color-info-strong)]">
                                            <p className="font-semibold text-[var(--color-text-primary)]">Origen de las unidades y del precio</p>
                                            <p className="mt-2 leading-6">
                                                Las <strong>rental units</strong> se generan desde la infraestructura de bodegas y la sincronización del catálogo; no es el flujo principal crearlas aquí. El backend <strong>ignora el precio enviado por línea</strong> y aplica el precio de catálogo parametrizado (ADMIN). En esta pantalla solo confirmamos unidades y fechas.
                                            </p>
                                            <p className="mt-2">
                                                <Link href="/dashboard/sales/rental-units" className="font-semibold underline">
                                                    Ver listado técnico de unidades
                                                </Link>
                                                {" · "}
                                                <Link href="/dashboard/sales/commercial-pricing" className="font-semibold underline">
                                                    Parametrización comercial
                                                </Link>
                                            </p>
                                        </div>

                                        {/* Tabla de unidades */}
                                        <FormSection
                                            title="2. Unidades del Contrato (Rental Units)"
                                            description="Inventario final de espacios que conformarán este contrato."
                                        >
                                            {isLoadingUnits ? (
                                                <div className="h-24 rounded-lg bg-[var(--color-surface-hover)] animate-pulse" />
                                            ) : (
                                                <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                                                            <tr>
                                                                <th className="p-3 font-semibold">Unidad</th>
                                                                <th className="p-3 font-semibold">Nivel</th>
                                                                <th className="p-3 font-semibold">ID</th>
                                                                <th className="p-3 font-semibold">Precio en contrato</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                                            {cartUnits.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={4} className="p-4 text-center text-[var(--color-text-tertiary)]">
                                                                        No hay unidades en el carrito. Regresa al catálogo.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                cartUnits.map(u => (
                                                                    <tr key={u.id}>
                                                                        <td className="p-3 font-medium">{getUnitDisplayName(u)}</td>
                                                                        <td className="p-3">
                                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--color-info-subtle)] text-[var(--color-info-strong)]">
                                                                                {getEntityLabel(u)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3 font-mono text-xs text-[var(--color-text-secondary)]">#{u.id}</td>
                                                                        <td className="p-3 text-xs text-[var(--color-text-secondary)]">
                                                                            Tomado del catálogo al crear (no editable aquí)
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Métricas del contrato */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div className="bg-[var(--color-surface-hover)] p-3 rounded">
                                                    <p className="text-xs text-[var(--color-text-secondary)] uppercase font-bold">Unidades</p>
                                                    <p className="font-bold text-xl">{cartUnits.length}</p>
                                                </div>
                                                <div className="bg-[var(--color-surface-hover)] p-3 rounded">
                                                    <p className="text-xs text-[var(--color-text-secondary)] uppercase font-bold">Duración</p>
                                                    <p className="font-bold text-xl">{totalDays} días</p>
                                                </div>
                                                <div className="bg-[var(--color-primary-subtle)] text-[var(--color-primary-strong)] p-3 rounded border border-[var(--color-primary-default)]/30 md:col-span-1 col-span-2">
                                                    <p className="text-xs uppercase font-bold">Estado Inicial</p>
                                                    <p className="font-black text-base uppercase tracking-wider">DRAFT</p>
                                                </div>
                                            </div>
                                        </FormSection>

                                        {/* Servicios operativos */}
                                        <FormSection
                                            title="3. Servicios Operativos Base"
                                            description="Módulos de aseo y seguridad mínimos para todo contrato."
                                        >
                                            <div className="p-4 border border-[var(--color-primary-default)]/30 bg-[var(--color-primary-subtle)] rounded-lg flex items-start gap-3">
                                                <Controller
                                                    name="include_basic_services"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <input
                                                            id="basic_services"
                                                            type="checkbox"
                                                            className="w-5 h-5 mt-0.5 rounded accent-[var(--color-primary-default)]"
                                                            checked={field.value === true}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                />
                                                <div>
                                                    <label htmlFor="basic_services" className="font-semibold text-[var(--color-primary-default)] cursor-pointer">
                                                        Incluir cuota de servicios (Aseo y Seguridad)
                                                    </label>
                                                    <p className="text-sm text-[var(--color-primary-default)] opacity-80 mt-1">
                                                        Aplica de manera obligatoria sobre todas las unidades contratadas durante {totalDays} días.
                                                    </p>
                                                    {errors.include_basic_services && (
                                                        <p className="text-xs text-[var(--color-danger-strong)] mt-1">{errors.include_basic_services.message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </FormSection>

                                        {/* Error de submit */}
                                        {submitError && (
                                            <div role="alert" className="rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger-strong)]">
                                                {submitError}
                                            </div>
                                        )}

                                        <FormActions align="between" className="pt-6 border-t border-[var(--color-border-subtle)]">
                                            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                                                ← Volver
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                isLoading={isSubmitting}
                                                disabled={!isValid || cartUnits.length === 0 || isSubmitting}
                                            >
                                                Generar Contrato y Continuar →
                                            </Button>
                                        </FormActions>
                                    </div>
                                )}
                            </Form>
                        </CardBody>
                    </Card>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
