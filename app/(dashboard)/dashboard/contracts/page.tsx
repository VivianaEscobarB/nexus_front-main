"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, Input, Select, Badge, Pagination } from "@/components/ui";
import { usePagination } from "@/shared/hooks/usePagination";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import {
    listContracts,
    cancelContract,
} from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import { userHasRole } from "@/shared/auth/primaryRole";
import { UserRole } from "@/types";
import type { Contract, ContractStatus } from "@/modules/sales";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible cargar los contratos.";
}

function getStatusInfo(status: ContractStatus | string): {
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
} {
    switch (status) {
        case "DRAFT":           return { label: "Borrador",          variant: "neutral" };
        case "ACTIVE":          return { label: "Activo",            variant: "success" };
        case "PENDING_PAYMENT": return { label: "Pendiente Pago",    variant: "warning" };
        case "COMPLETED":       return { label: "Completado",        variant: "success" };
        case "APPROVED":        return { label: "Aprobado (Falta Ingreso)", variant: "success" };
        case "EXPIRED":         return { label: "Expirado (Timelock)", variant: "danger"  };
        case "CANCELLED":       return { label: "Cancelado",         variant: "danger"  };
        default:                return { label: status as string,    variant: "neutral" };
    }
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("es-CO", {
            day: "2-digit", month: "short", year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function ContractsPage() {
    const { user } = useAuth();

    const [contracts,   setContracts]   = useState<Contract[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [pageError,   setPageError]   = useState<string | null>(null);
    const [searchTerm,  setSearchTerm]  = useState("");
    const [statusFilter,setStatusFilter]= useState<string>("ALL");
    const [cancelling,  setCancelling]  = useState<number | null>(null);

    // ── Fetch ──────────────────────────────────────────────
    const fetchContracts = useCallback(async () => {
        setIsLoading(true);
        setPageError(null);
        try {
            const data = await listContracts();
            setContracts(data);
        } catch (err) {
            setPageError(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // ── Filter ─────────────────────────────────────────────
    const filtered = contracts.filter(c => {
        const matchSearch =
            c.contractId?.toString().includes(searchTerm) ||
            (c.client?.businessName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.client?.documentNumber ?? "").includes(searchTerm);
        const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const {
        paginatedData: paginatedContracts,
        currentPage,
        totalPages,
        goToPage,
    } = usePagination(filtered, 5); // 5 elements per page as defined in standardization

    // ── Cancel ─────────────────────────────────────────────
    const handleCancel = async (contractId: number) => {
        if (!confirm("¿Seguro que deseas cancelar este contrato? Esta acción no se puede deshacer.")) return;
        setCancelling(contractId);
        try {
            await cancelContract(contractId);
            await fetchContracts();
        } catch (err) {
            alert(getApiErrorMessage(err));
        } finally {
            setCancelling(null);
        }
    };

    const isSalesAgentOrAdmin = user?.roles?.some(r =>
        r.role_name === "SALES_AGENT" || r.role_name === "ADMIN"
    );

    return (
        <ProcessVisibilityGuard process="contracts">
            <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Acuerdos Comerciales
                        </h1>
                        <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
                            Registro centralizado de contratos de arrendamiento activos y finalizados.
                        </p>
                    </div>
                    {isSalesAgentOrAdmin && (
                        <Link href="/dashboard/sales/contracts/create">
                            <Button variant="primary">+ Contrato Directo</Button>
                        </Link>
                    )}
                </div>

                {/* Error */}
                {pageError ? (
                    <Alert variant="danger" className="flex items-center justify-between rounded-lg">
                        <span>{pageError}</span>
                        <Button variant="ghost" size="sm" onClick={fetchContracts}>Reintentar</Button>
                    </Alert>
                ) : null}

                <Card>
                    <CardBody className="p-0">
                        {/* Filtros */}
                        <div className="p-4 bg-[var(--color-surface-hover)] border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 max-w-sm">
                                <Input
                                    placeholder="Buscar por ID, empresa o documento..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-52">
                                <Select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    options={[
                                        { value: "ALL",             label: "Cualquier Estado"   },
                                        { value: "DRAFT",           label: "Borrador"           },
                                        { value: "ACTIVE",          label: "Activos"            },
                                        { value: "APPROVED",        label: "Aprobados"          },
                                        { value: "PENDING_PAYMENT", label: "Pendiente Pago"     },
                                        { value: "COMPLETED",       label: "Completados"        },
                                        { value: "EXPIRED",         label: "Expirados"          },
                                        { value: "CANCELLED",       label: "Cancelados"         },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase">Contrato</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase">Cliente</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase">Unidades (Rental Units)</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase">Vigencia</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                    {isLoading ? (
                                        [...Array(4)].map((_, i) => (
                                            <tr key={i}>
                                                {[...Array(5)].map((_, j) => (
                                                    <td key={j} className="px-6 py-4">
                                                        <div className="h-4 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : paginatedContracts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-text-tertiary)]">
                                                No se encontraron contratos con esos filtros.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedContracts.map((contract) => {
                                            const si = getStatusInfo(contract.status);
                                            return (
                                                <tr key={contract.contractId} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                                                    <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">
                                                        #{contract.contractId}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-[var(--color-text-primary)]">
                                                            {contract.client?.businessName ?? `Cliente #${contract.clientId}`}
                                                        </div>
                                                        {contract.client && (
                                                            <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
                                                                {contract.client.documentType}: {contract.client.documentNumber}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-primary-subtle)] text-[var(--color-primary-strong)] px-2 py-0.5 rounded-full">
                                                            {contract.contractRentalUnits?.length || 0} unidades
                                                        </span>
                                                        {(contract.contractRentalUnits?.length || 0) > 0 && (
                                                            <div
                                                                className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-[200px] truncate"
                                                                title={contract.contractRentalUnits?.filter(u => u.rentalUnitId > 0).map(u => `ID:${u.rentalUnitId}`).join(", ") || "Sin IDs de unidad en respuesta"}
                                                            >
                                                                {contract.contractRentalUnits
                                                                    ?.filter(u => u.rentalUnitId > 0)
                                                                    .map(u => `#${u.rentalUnitId}`)
                                                                    .join(", ") || "Pendiente de detalle"}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                        {formatDate(contract.startDate)} al {formatDate(contract.endDate)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex gap-2 justify-end items-center">
                                                        <Badge variant={si.variant} label={si.label} />
                                                        
                                                        {(contract.status === "PENDING_PAYMENT" || contract.status === "DRAFT") && (
                                                            <Link href={`/dashboard/sales/checkout/${contract.contractId}`}>
                                                                <Button variant="primary" size="sm">
                                                                    Cerrar y Facturar
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        {(contract.status === "ACTIVE" || contract.status === "PENDING_PAYMENT") && isSalesAgentOrAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                isLoading={cancelling === contract.contractId}
                                                                onClick={() => handleCancel(contract.contractId)}
                                                                className="text-[var(--color-danger-default)]"
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        )}
                                                        {contract.status !== "PENDING_PAYMENT" && contract.status !== "DRAFT" && (
                                                            <Button variant="ghost" size="sm" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-default)]">
                                                                Ver Detalle
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                            className="px-4"
                        />
                    </CardBody>
                </Card>
            </div>
        </ProcessVisibilityGuard>
    );
}
