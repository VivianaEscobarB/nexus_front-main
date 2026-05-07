"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, Input, Pagination } from "@/components/ui";
import { usePagination } from "@/shared/hooks/usePagination";
import { RoleGuard } from "@/modules/auth";
import {
    consumeClientCreateSuccessMessage,
    listClients,
} from "@/modules/clients";
import { isApiError } from "@/shared/api/apiError";
import type { ManagedClient } from "@/modules/clients";
import { UserRole } from "@/types";

function PlusIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        return error.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible cargar los clientes.";
}

export default function ClientDirectoryPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [clients, setClients] = useState<ManagedClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    useEffect(() => {
        const flashMessage = consumeClientCreateSuccessMessage();

        if (flashMessage) {
            setFeedbackMessage(flashMessage);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setIsLoading(true);
            setPageError(null);

            try {
                const data = await listClients();
                if (isMounted) {
                    setClients(data);
                }
            } catch (error) {
                if (isMounted) {
                    setPageError(getErrorMessage(error));
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredClients = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return clients.filter((client) =>
            search.length === 0 ||
            client.businessName.toLowerCase().includes(search) ||
            client.name.toLowerCase().includes(search) ||
            client.email.toLowerCase().includes(search) ||
            (client.documentNumber ?? "").includes(searchTerm)
        );
    }, [clients, searchTerm]);

    const {
        paginatedData: paginatedClients,
        currentPage,
        totalPages,
        goToPage,
    } = usePagination(filteredClients, 5);

    return (
        <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                    <Button
                        variant="primary"
                        className="flex items-center gap-2"
                        onClick={() => router.push("/dashboard/clients/create")}
                    >
                        <PlusIcon /> Registrar nuevo prospecto
                    </Button>
                </div>

                {feedbackMessage ? (
                    <Alert variant="success" role="status" className="rounded-lg">
                        {feedbackMessage}
                    </Alert>
                ) : null}

                {pageError ? (
                    <Alert variant="danger" className="rounded-lg">
                        {pageError}
                    </Alert>
                ) : null}

                <Card padding="md">
                    <CardBody className="space-y-4">
                        <div className="max-w-md">
                            <Input
                                placeholder="Buscar por empresa, contacto, documento o correo..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Empresa</th>
                                        <th className="px-4 py-3 font-semibold">Contacto</th>
                                        <th className="px-4 py-3 font-semibold">Identificacion</th>
                                        <th className="px-4 py-3 font-semibold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-text-secondary)]">
                                                Cargando clientes...
                                            </td>
                                        </tr>
                                    ) : filteredClients.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-text-secondary)]">
                                                No se encontraron clientes con esos criterios.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedClients.map((client) => (
                                            <tr key={client.id} className="hover:bg-[var(--color-surface-hover)]/50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-[var(--color-text-primary)]">{client.businessName}</div>
                                                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                                        {client.address || "Sin dirección registrada"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div>{client.name}</div>
                                                    <div className="text-[var(--color-text-secondary)] text-xs mt-0.5">{client.email}</div>
                                                    <div className="text-[var(--color-text-tertiary)] text-xs mt-0.5">
                                                        {client.phone || "Sin teléfono"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="text-[var(--color-text-secondary)] text-xs font-bold mr-1">
                                                        {client.documentType || "DOC"}
                                                    </span>
                                                    {client.documentNumber || "Sin número"}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                        client.status === "ACTIVE"
                                                            ? "bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] border border-[var(--color-success-default)]/20"
                                                            : "bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)] border border-[var(--color-danger-default)]/20"
                                                    }`}>
                                                        {client.status === "ACTIVE" ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                        />
                    </CardBody>
                </Card>
            </div>
        </RoleGuard>
    );
}
