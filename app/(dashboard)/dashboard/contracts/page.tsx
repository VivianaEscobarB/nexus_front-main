"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, CardBody, Input, Select, Badge, Pagination } from "@/components/ui";
import { usePagination } from "@/shared/hooks/usePagination";
import Link from "next/link";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { Contract } from "@/types";

// --- MOCK DATA ---
const MOCK_CONTRACTS: Contract[] = [
    {
        contract_id: "CT-2026-001",
        client_id: "CL-001",
        warehouse_id: "WH-A1-001",
        start_date: "2026-03-01T00:00:00Z",
        end_date: "2026-09-01T00:00:00Z",
        status: "ACTIVE",
        total_amount: 15400,
        client: {
            client_id: "CL-001",
            business_name: "Frigoríficos del Norte S.A.",
            document_type: "NIT",
            document_number: "900.123.456-7",
            email: "contacto@frigonorte.com",
            name: "Laura Martinez",
            status: "ACTIVE",
            phone: "+57 300 123 4567",
            address: "Calle 100 # 14-25"
        },
        warehouse: {
            warehouse_id: "WH-A1-001",
            code: "BDG-ALIM-01",
            name: "Bodega Frío Central",
            address: "Zona Franca Lote 4",
            total_capacity_m2: 500,
            available_capacity_m2: 250,
            city_id: "CIT-01",
            warehouse_type_id: "WT-01"
        }
    },
    {
        contract_id: "CT-2026-002",
        client_id: "CL-002",
        warehouse_id: "WH-B1-002",
        start_date: "2026-03-05T00:00:00Z",
        end_date: "2026-12-05T00:00:00Z",
        status: "PENDING_PAYMENT",
        total_amount: 8500,
        client: {
            client_id: "CL-002",
            business_name: "Textiles Andinos Ltda.",
            document_type: "NIT",
            document_number: "800.987.654-3",
            email: "gerencia@textilesandinos.com",
            name: "Carlos Rojas",
            status: "ACTIVE",
            phone: "+57 311 987 6543",
            address: "Carrera 50 # 22-10"
        },
        warehouse: {
            warehouse_id: "WH-B1-002",
            code: "BDG-TEXT-02",
            name: "Bodega Seca Principal",
            address: "Zona Norte Lote 12",
            total_capacity_m2: 1200,
            available_capacity_m2: 800,
            city_id: "CIT-01",
            warehouse_type_id: "WT-02"
        }
    },
    {
        contract_id: "CT-2026-003",
        client_id: "CL-003",
        warehouse_id: "WH-C1-003",
        start_date: "2026-02-01T00:00:00Z",
        end_date: "2026-02-28T00:00:00Z",
        status: "EXPIRED",
        total_amount: 3200,
        client: {
            client_id: "CL-003",
            business_name: "Importaciones Generales SAS",
            document_type: "NIT",
            document_number: "901.345.678-9",
            email: "logistica@impgen.com",
            name: "Mariana Soto",
            status: "INACTIVE",
            phone: "+57 320 345 6789",
            address: "Avenida 68 # 50-20"
        },
        warehouse: {
            warehouse_id: "WH-C1-003",
            code: "BDG-IND-03",
            name: "Bodega Industrial Este",
            address: "Zona Este Lote 8",
            total_capacity_m2: 2000,
            available_capacity_m2: 150,
            city_id: "CIT-01",
            warehouse_type_id: "WT-03"
        }
    }
];

// --- COMPONENTE PRINCIPAL ---
export default function ContractsPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Lógica de filtrado
    const filteredContracts = MOCK_CONTRACTS.filter((contract) => {
        const matchesSearch =
            contract.contract_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.client?.business_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || contract.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const {
        paginatedData: paginatedContracts,
        currentPage,
        totalPages,
        goToPage,
    } = usePagination(filteredContracts, 5);

    const getStatusInfo = (status: Contract["status"]) => {
        switch (status) {
            case "ACTIVE":
                return { label: "Activo", variant: "success" as const };
            case "APPROVED":
                return { label: "Aprobado (Falta Ingreso)", variant: "success" as const };
            case "PENDING_PAYMENT":
                return { label: "Pendiente Pago", variant: "warning" as const };
            case "DRAFT":
                return { label: "Borrador", variant: "neutral" as const };
            case "EXPIRED":
                return { label: "Expirado (Timelock)", variant: "danger" as const };
            case "CANCELLED":
                return { label: "Cancelado", variant: "danger" as const };
            default:
                return { label: status, variant: "neutral" as const };
        }
    };

    return (
        <ProcessVisibilityGuard process="contracts">
            <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-end items-center gap-4">
                {user?.roles?.some(r => r.role_name === "SALES_AGENT" || r.role_name === "ADMIN") && (
                    <Link href="/dashboard/sales/contracts/create">
                        <Button variant="primary">
                            + Nuevo Contrato
                        </Button>
                    </Link>
                )}
            </div>

            {/* Tarjeta con Filtros y Tabla */}
            <Card>
                <CardBody className="p-0">
                    <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-[var(--color-surface-hover)]" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <div className="flex-1 max-w-md relative">
                            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <Input
                                type="text"
                                placeholder="Buscar por ID o razón social..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { value: "ALL", label: "Todos los Estados" },
                                    { value: "ACTIVE", label: "Activos" },
                                    { value: "PENDING_PAYMENT", label: "Pendientes de Pago" },
                                    { value: "EXPIRED", label: "Expirados" },
                                    { value: "CANCELLED", label: "Cancelados" }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Contrato</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Bodega Asignada</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Vigencia</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Total (USD)</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-[var(--color-text-tertiary)]">
                                            No se encontraron contratos con esos filtros.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedContracts.map((contract) => {
                                        const statusInfo = getStatusInfo(contract.status);
                                        return (
                                            <tr key={contract.contract_id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                                                <td className="px-6 py-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                                                    {contract.contract_id}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium" style={{ color: "var(--color-text-primary)" }}>{contract.client?.business_name}</div>
                                                    <div className="text-xs text-[var(--color-text-tertiary)]">{contract.client?.document_type}: {contract.client?.document_number}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs px-2 py-1 rounded bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] font-medium">
                                                            {contract.warehouse?.code}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                    {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
                                                    ${contract.total_amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={statusInfo.variant} label={statusInfo.label} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {contract.status === "PENDING_PAYMENT" ? (
                                                        <Link href={`/dashboard/sales/checkout?source=${contract.contract_id}`}>
                                                            <Button variant="outline" size="sm" className="h-8">
                                                                Portal de Pago
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-default)]">
                                                            Detalles
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
