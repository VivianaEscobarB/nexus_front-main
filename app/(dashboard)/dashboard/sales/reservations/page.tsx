"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { Badge } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import {
    listReservations,
    cancelReservation,
} from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import type { Reservation, ReservationStatus } from "@/modules/sales";
import { UserRole } from "@/types";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar las reservas.";
}

function getStatusInfo(status: ReservationStatus): {
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
} {
    switch (status) {
        case "PENDING":   return { label: "Pendiente",  variant: "warning" };
        case "APPROVED":  return { label: "Aprobada",   variant: "success" };
        case "REJECTED":  return { label: "Rechazada",  variant: "danger"  };
        case "CANCELLED": return { label: "Cancelada",  variant: "neutral" };
    }
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function ReservationsPage() {
    const router = useRouter();

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [pageError,    setPageError]    = useState<string | null>(null);

    const [searchTerm,    setSearchTerm]    = useState("");
    const [statusFilter,  setStatusFilter]  = useState<string>("ALL");

    const [selected,      setSelected]      = useState<Reservation | null>(null);
    const [isCancelling,  setIsCancelling]  = useState(false);
    const [actionError,   setActionError]   = useState<string | null>(null);

    // ── Fetch ──────────────────────────────────────────────
    const fetchReservations = useCallback(async () => {
        setIsLoading(true);
        setPageError(null);
        try {
            const data = await listReservations();
            setReservations(data);
        } catch (err) {
            setPageError(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    // ── Filter ─────────────────────────────────────────────
    const filtered = reservations.filter(res => {
        const matchSearch =
            res.id.toString().includes(searchTerm) ||
            res.reservationToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (res.client?.businessName ?? "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = statusFilter === "ALL" || res.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // ── Cancel ─────────────────────────────────────────────
    const handleCancel = async (res: Reservation) => {
        if (!res.reservationToken) return;
        setIsCancelling(true);
        setActionError(null);
        try {
            await cancelReservation(res.reservationToken);
            setSelected(null);
            await fetchReservations();
        } catch (err) {
            setActionError(getApiErrorMessage(err));
        } finally {
            setIsCancelling(false);
        }
    };

    // ── Create contract from reservation ───────────────────
    const handleToContract = (res: Reservation) => {
        const unitIds = res.units
            .map(u => u.rentalUnitId || u.rentalUnit?.id || 0)
            .filter((id): id is number => Number.isFinite(id) && id > 0)
            .join(",");
        router.push(
            `/dashboard/sales/contracts/create?reservationId=${res.id}&token=${encodeURIComponent(res.reservationToken)}&units=${unitIds}&start=${encodeURIComponent(res.startDate)}&end=${encodeURIComponent(res.endDate)}`
        );
    };

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.SALES_AGENT, UserRole.ADMIN]}>
                <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                                Gestión de Reservas
                            </h1>
                            <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
                                Administra las solicitudes de alquiler antes de formalizar el contrato.
                            </p>
                        </div>
                        <Button variant="primary" onClick={() => router.push("/dashboard/sales/catalog")}>
                            + Nueva Reserva (Catálogo)
                        </Button>
                    </div>

                    {/* Error global */}
                    {pageError && (
                        <div role="alert" className="rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)] flex items-center justify-between">
                            <span>{pageError}</span>
                            <Button variant="ghost" size="sm" onClick={fetchReservations}>Reintentar</Button>
                        </div>
                    )}

                    {/* Tabla */}
                    <Card>
                        <CardBody className="p-0">
                            {/* Barra de filtros */}
                            <div className="p-4 bg-[var(--color-surface-hover)] border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 max-w-sm">
                                    <Input
                                        placeholder="Buscar por cliente, token o ID..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <Select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        options={[
                                            { value: "ALL",       label: "Todos los estados" },
                                            { value: "PENDING",   label: "Pendientes"        },
                                            { value: "APPROVED",  label: "Aprobadas"         },
                                            { value: "REJECTED",  label: "Rechazadas"        },
                                            { value: "CANCELLED", label: "Canceladas"        },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">ID</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">Cliente</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">Token</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">Periodo</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">Unidades</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase">Estado</th>
                                            <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                        {isLoading ? (
                                            [...Array(4)].map((_, i) => (
                                                <tr key={i}>
                                                    {[...Array(7)].map((_, j) => (
                                                        <td key={j} className="px-6 py-4">
                                                            <div className="h-4 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-[var(--color-text-tertiary)]">
                                                    No se encontraron reservas.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map(res => {
                                                const si = getStatusInfo(res.status);
                                                return (
                                                    <tr key={res.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                                                        <td className="px-6 py-4 font-medium">#{res.id}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-[var(--color-text-primary)]">
                                                                {res.client?.businessName ?? `Cliente #${res.clientId}`}
                                                            </div>
                                                            {res.client && (
                                                                <div className="text-xs text-[var(--color-text-tertiary)]">
                                                                    {res.client.documentType}: {res.client.documentNumber}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-[var(--color-text-secondary)]">
                                                            {res.reservationToken}
                                                        </td>
                                                        <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                            {res.startDate} → {res.endDate}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-bold bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] px-2 py-1 rounded-full">
                                                                {res.units.length} unid.
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant={si.variant} label={si.label} />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button variant="outline" size="sm" onClick={() => setSelected(res)}>
                                                                Revisar
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Panel lateral de detalle */}
                    {selected && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                            <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-[var(--color-surface-overlay)] p-6 shadow-2xl animate-in slide-in-from-right-full duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold">Detalle de Reserva #{selected.id}</h2>
                                    <button
                                        onClick={() => { setSelected(null); setActionError(null); }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-xl leading-none"
                                        aria-label="Cerrar panel"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="space-y-5 flex-1">
                                    {/* Datos base */}
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-semibold">Token:</span> <span className="font-mono text-xs">{selected.reservationToken}</span></p>
                                        <p><span className="font-semibold">Periodo:</span> {selected.startDate} → {selected.endDate}</p>
                                        <p><span className="font-semibold">Expira:</span> {selected.expiresAt || "N/A"}</p>
                                        <p><span className="font-semibold">Estado:</span> <Badge variant={getStatusInfo(selected.status).variant} label={getStatusInfo(selected.status).label} /></p>
                                    </div>

                                    {/* Cliente */}
                                    {selected.client && (
                                        <div className="p-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] text-sm">
                                            <p className="font-bold">{selected.client.businessName}</p>
                                            <p className="text-[var(--color-text-secondary)]">{selected.client.documentType}: {selected.client.documentNumber}</p>
                                        </div>
                                    )}

                                    {/* Unidades */}
                                    <div>
                                        <p className="text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-2">Unidades Solicitadas</p>
                                        <div className="space-y-2">
                                            {selected.units.map((u, i) => (
                                                <div key={i} className="p-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] flex justify-between text-sm">
                                                    <div>
                                                        <p className="font-medium">
                                                            {u.rentalUnit
                                                                ? (u.rentalUnit.warehouse?.name ?? u.rentalUnit.sector?.code ?? u.rentalUnit.storageSpace?.code ?? `Unidad #${u.rentalUnitId}`)
                                                                : `Rental Unit #${u.rentalUnitId}`
                                                            }
                                                        </p>
                                                        <p className="text-xs text-[var(--color-text-secondary)]">ID: {u.rentalUnitId}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Aviso de disponibilidad */}
                                    <div className="bg-[var(--color-info-subtle)] border border-[var(--color-info-default)]/30 p-3 rounded text-sm text-[var(--color-info-strong)]">
                                        La disponibilidad de las unidades se verificará en tiempo real antes de estructurar el contrato.
                                    </div>

                                    {/* Error de acción */}
                                    {actionError && (
                                        <div role="alert" className="rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger-strong)]">
                                            {actionError}
                                        </div>
                                    )}
                                </div>

                                {/* Acciones de pie */}
                                <div className="pt-5 border-t border-[var(--color-border-subtle)] mt-4 flex flex-col gap-3">
                                    {(selected.status === "APPROVED" || selected.status === "PENDING") && (
                                        <Button variant="primary" className="w-full" onClick={() => handleToContract(selected)}>
                                            Estructurar Contrato →
                                        </Button>
                                    )}
                                    {selected.status === "PENDING" && (
                                        <Button
                                            variant="danger"
                                            className="w-full"
                                            onClick={() => handleCancel(selected)}
                                            isLoading={isCancelling}
                                        >
                                            Cancelar Reserva
                                        </Button>
                                    )}
                                    <Button variant="ghost" onClick={() => { setSelected(null); setActionError(null); }}>
                                        Cerrar panel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
