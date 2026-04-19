"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RentalUnitsCatalog } from "./RentalUnitsCatalog";
import { ClientSelector } from "./ClientSelector";
import { CreateClientModal } from "./CreateClientModal";
import { SelectedRentalUnitsSummary } from "./SelectedRentalUnitsSummary";
import { useRentalSelection } from "../hooks/useRentalSelection";
import { useRentalUnits } from "../hooks/useRentalUnits";
import { useCreateReservation } from "../hooks/useCreateReservation";
import type { Client } from "../types/Client";
import { Button, Input } from "@/components/ui";
import { getRentalUnit, validateBulkAvailability } from "@/modules/sales";
import type { RentalUnit } from "../types/rentalUnit.types";

// ──────────────────────────────────────────────────────────────
// SKELETON para la carga inicial del catálogo
// ──────────────────────────────────────────────────────────────
function CatalogSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 animate-pulse">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="min-h-[220px] rounded-xl bg-[var(--color-surface-hover)]" />
            ))}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// FORMULARIO DE RESERVA — aparece cuando hay unidades y cliente
// ──────────────────────────────────────────────────────────────
interface ReservationFormProps {
    selectedUnits: { rentalUnitId: number }[];
    /** Unidades resueltas (catálogo + detalle por GET si aplica) */
    selectedUnitModels: RentalUnit[];
    selectedClient: Client | null;
    onSelectClient: (c: Client | null) => void;
    onCreateClient: () => void;
    startDate: string;
    endDate: string;
    onStartDate: (v: string) => void;
    onEndDate: (v: string) => void;
    onConfirm: () => void;
    isCheckingAvailability: boolean;
    isCreating: boolean;
    error: string | null;
}

function ReservationForm({
    selectedUnits, selectedUnitModels, selectedClient, onSelectClient, onCreateClient,
    startDate, endDate, onStartDate, onEndDate,
    onConfirm, isCheckingAvailability, isCreating, error
}: ReservationFormProps) {
    const today = new Date().toISOString().split("T")[0];
    const isValid = selectedUnits.length > 0
        && !!selectedClient
        && !!startDate
        && !!endDate
        && startDate <= endDate;

    const isSubmitting = isCheckingAvailability || isCreating;

    return (
        <div className="rounded-xl border-2 border-[var(--color-primary-default)] bg-[var(--color-surface-base)] shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="px-6 py-4 bg-[var(--color-primary-subtle)] border-b border-[var(--color-primary-default)]">
                <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                    Datos del Contrato de Reserva
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {selectedUnits.length} unidad{selectedUnits.length !== 1 ? "es" : ""} seleccionada{selectedUnits.length !== 1 ? "s" : ""}
                </p>
            </div>

            <div className="p-6 space-y-5">
                {/* Error banner */}
                {error && (
                    <div role="alert" className="p-3 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger-default)] text-[var(--color-danger-strong)] text-sm">
                        {error}
                    </div>
                )}

                <SelectedRentalUnitsSummary units={selectedUnitModels} />

                {/* Cliente */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">
                        1. Seleccionar Cliente
                    </p>
                    <ClientSelector
                        selectedClient={selectedClient}
                        onSelectClient={onSelectClient}
                        onCreateClient={onCreateClient}
                    />
                </div>

                {/* Fechas del contrato */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">
                        2. Fechas del Contrato
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Fecha de Inicio"
                            value={startDate}
                            min={today}
                            onChange={e => onStartDate(e.target.value)}
                        />
                        <Input
                            type="date"
                            label="Fecha de Fin"
                            value={endDate}
                            min={startDate || today}
                            onChange={e => onEndDate(e.target.value)}
                        />
                    </div>
                    {startDate && endDate && startDate > endDate && (
                        <p className="text-xs text-[var(--color-danger-strong)] mt-1">
                            La fecha de fin debe ser posterior a la de inicio.
                        </p>
                    )}
                </div>

                {/* Confirm */}
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onConfirm}
                    isLoading={isSubmitting}
                    disabled={!isValid || isSubmitting}
                    className="w-full"
                >
                    {isCheckingAvailability
                        ? "Verificando disponibilidad..."
                        : isCreating
                          ? "Creando reserva..."
                          : "Confirmar Reserva"}
                </Button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// ORQUESTADOR PRINCIPAL
// ──────────────────────────────────────────────────────────────
export function RentalReservationFlow() {
    const { selectedUnits, addUnit, removeUnit, isSelected, clearSelection } = useRentalSelection();
    const { units, isLoading, error: catalogError, searchUnits } = useRentalUnits();
    const { createReservation, isLoading: isCreating, error: createError } = useCreateReservation();

    const [detailById, setDetailById] = useState<Record<number, RentalUnit>>({});

    const selectedIdsKey = useMemo(
        () => [...selectedUnits.map(s => s.rentalUnitId)].sort((a, b) => a - b).join(","),
        [selectedUnits]
    );

    useEffect(() => {
        if (!selectedIdsKey) return undefined;
        let cancelled = false;
        const ids = selectedIdsKey.split(",").map(Number).filter(n => Number.isFinite(n));
        void Promise.all(
            ids.map(async id => {
                try {
                    const d = await getRentalUnit(id);
                    if (!cancelled) {
                        setDetailById(prev => ({ ...prev, [id]: d }));
                    }
                } catch {
                    /* el catálogo sigue siendo válido */
                }
            })
        );
        return () => {
            cancelled = true;
        };
    }, [selectedIdsKey]);

    const selectedResolvedUnits = useMemo(
        () =>
            selectedUnits
                .map(s => detailById[s.rentalUnitId] ?? units.find(u => u.id === s.rentalUnitId))
                .filter((u): u is RentalUnit => u != null),
        [selectedUnits, units, detailById]
    );

    // Fechas viven en el formulario de reserva, NO en el catálogo
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate]     = useState("");

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [openModal, setOpenModal]           = useState(false);
    const [successToken, setSuccessToken]     = useState<string | null>(null);
    const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);
    const [successReservationId, setSuccessReservationId] = useState<number | null>(null);
    const [successStartDate, setSuccessStartDate] = useState<string | null>(null);
    const [successEndDate, setSuccessEndDate] = useState<string | null>(null);
    const [successRentalUnitIds, setSuccessRentalUnitIds] = useState<number[]>([]);
    /** Error local (p. ej. disponibilidad); no interfiere con createError del hook. */
    const [preflightError, setPreflightError] = useState<string | null>(null);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

    // ── Cargar catálogo inmediatamente al montar (sin filtro de fechas) ──
    useEffect(() => {
        searchUnits("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setPreflightError(null);
    }, [startDate, endDate, selectedIdsKey, selectedClient?.id]);

    const handleToggleSelect = (unit: RentalUnit) => {
        if (isSelected(unit.id)) removeUnit(unit.id);
        else                     addUnit(unit);
    };

    const handleConfirmReservation = async () => {
        if (!selectedClient || selectedUnits.length === 0 || !startDate || !endDate) return;

        setPreflightError(null);
        setIsCheckingAvailability(true);

        const rentalUnitIds = selectedUnits.map(u => u.rentalUnitId);
        const payload = {
            clientId: selectedClient.id,
            rentalUnitIds,
            startDate,
            endDate,
        };

        try {
            const available = await validateBulkAvailability({
                rentalUnitIds,
                startDate,
                endDate,
            });
            if (!available) {
                setPreflightError(
                    "Las unidades seleccionadas no están disponibles para el rango de fechas indicado. Ajusta las fechas o la selección e inténtalo de nuevo."
                );
                return;
            }
        } catch {
            setPreflightError(
                "No fue posible verificar la disponibilidad. Revisa tu conexión o inténtalo de nuevo en unos segundos."
            );
            return;
        } finally {
            setIsCheckingAvailability(false);
        }

        const result = await createReservation(payload);
        if (result) {
            setSuccessToken(result.token);
            setSuccessExpiresAt(result.expiresAt?.trim() || null);
            setSuccessReservationId(result.id);
            setSuccessStartDate(startDate);
            setSuccessEndDate(endDate);
            setSuccessRentalUnitIds(rentalUnitIds);
            clearSelection();
        }
    };

    // ── PANTALLA DE ÉXITO ──────────────────────────────────────────
    if (successToken) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-[var(--color-success-subtle)] border-2 border-[var(--color-success-default)] rounded-xl p-10 text-center shadow-lg animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-[var(--color-success-strong)] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                    <h2 className="text-2xl font-bold text-[var(--color-success-strong)] mb-2">¡Reserva Comercial Creada!</h2>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        Las unidades seleccionadas han sido bloqueadas en el inventario.
                    </p>
                    {successExpiresAt && (
                        <p className="mb-4 max-w-md mx-auto text-sm text-[var(--color-text-primary)]">
                            Vencimiento referencia:{" "}
                            <span className="font-mono font-semibold">{successExpiresAt}</span>
                        </p>
                    )}
                    <div
                        className="mb-6 inline-block max-w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-6 py-4 text-left shadow-sm"
                    >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                            Código de reserva
                        </p>
                        <p className="break-all font-mono text-xl font-semibold leading-snug tracking-wide text-[var(--color-text-primary)] sm:text-2xl">
                            {successToken}
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="primary"
                            onClick={() => {
                                const query = new URLSearchParams({
                                    reservationId: String(successReservationId ?? ""),
                                    token: successToken,
                                    units: successRentalUnitIds.join(","),
                                    start: successStartDate ?? "",
                                    end: successEndDate ?? "",
                                });
                                window.location.href = `/dashboard/sales/contracts/create?${query.toString()}`;
                            }}
                        >
                            Continuar a Contrato
                        </Button>
                        <Button variant="outline" onClick={() => window.location.reload()}>Nueva Consulta</Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── FLUJO NORMAL ───────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── SECCIÓN 1: Catálogo (carga inmediata) ── */}
            {catalogError && (
                <div role="alert" className="p-4 rounded-xl text-center bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)] border border-[var(--color-danger-default)]">
                    No fue posible cargar el catálogo de unidades.
                </div>
            )}

            {isLoading && <CatalogSkeleton />}

            {!isLoading && !catalogError && units.length === 0 && (
                <div className="text-center py-16 text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] rounded-xl border border-dashed border-[var(--color-border-subtle)]">
                    No hay unidades de arrendamiento registradas en el inventario.
                </div>
            )}

            {!isLoading && !catalogError && units.length > 0 && (
                <RentalUnitsCatalog
                    units={units}
                    isSelected={isSelected}
                    onToggleSelect={handleToggleSelect}
                />
            )}

            {/* ── SECCIÓN 2 + 3: Formulario de reserva (aparece cuando hay selección) ── */}
            {selectedUnits.length > 0 && (
                <ReservationForm
                    selectedUnits={selectedUnits}
                    selectedUnitModels={selectedResolvedUnits}
                    selectedClient={selectedClient}
                    onSelectClient={setSelectedClient}
                    onCreateClient={() => setOpenModal(true)}
                    startDate={startDate}
                    endDate={endDate}
                    onStartDate={setStartDate}
                    onEndDate={setEndDate}
                    onConfirm={handleConfirmReservation}
                    isCheckingAvailability={isCheckingAvailability}
                    isCreating={isCreating}
                    error={preflightError ?? createError}
                />
            )}

            {/* ── MODAL: Crear cliente ── */}
            {openModal && (
                <CreateClientModal
                    onClose={() => setOpenModal(false)}
                    onCreated={newClient => {
                        setSelectedClient(newClient);
                        setOpenModal(false);
                    }}
                />
            )}
        </div>
    );
}

