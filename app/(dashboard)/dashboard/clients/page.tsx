"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Input } from "@/components/ui";

function EditIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
}

function PlusIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}

// ----------------------------------------------------------------------
// Mock Data 
// ----------------------------------------------------------------------
const MOCK_CLIENTS = [
    { client_id: "C1", document_type: "NIT", document_number: "900123456-7", business_name: "Distribuidora NEXUS S.A.", phone: "+57 300 123 4567", email: "contacto@nexus-dist.com", address: "Calle 100 # 14-25, Bogotá", status: "ACTIVE" },
    { client_id: "C2", document_type: "NIT", document_number: "800987654-3", business_name: "Importaciones Globales", phone: "+57 310 987 6543", email: "admin@iglobal.co", address: "Av. El Dorado # 68-12, Bogotá", status: "ACTIVE" },
    { client_id: "C3", document_type: "NIT", document_number: "901234567-1", business_name: "Textiles del Norte", phone: "+57 320 456 7890", email: "compras@textilesnorte.com", address: "Cra. 45 # 10-50, Medellín", status: "INACTIVE" },
];

export default function ClientDirectoryPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredClients = MOCK_CLIENTS.filter(c => 
        c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.document_number.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Directorio Comercial (Clientes)</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Gestione la información comercial y datos de contacto de las empresas arrendatarias.</p>
                </div>
                <Button 
                    variant="primary" 
                    className="flex items-center gap-2"
                    onClick={() => router.push("/dashboard/clients/create")}
                >
                    <PlusIcon /> Registrar Nuevo Cliente
                </Button>
            </div>

            <Card padding="md">
                <CardBody className="space-y-4">
                    {/* Search Bar */}
                    <div className="max-w-md">
                        <Input 
                            placeholder="Buscar por Nombre Comercial, NIT o Correo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Empresa / Razón Social</th>
                                    <th className="px-4 py-3 font-semibold">Identificación</th>
                                    <th className="px-4 py-3 font-semibold">Contacto Preferido</th>
                                    <th className="px-4 py-3 font-semibold">Estado Cuenta</th>
                                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredClients.map((client) => (
                                    <tr key={client.client_id} className="hover:bg-[var(--color-surface-hover)]/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-[var(--color-text-primary)]">{client.business_name}</div>
                                            <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{client.address}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-[var(--color-text-secondary)] text-xs font-bold mr-1">{client.document_type}</span>
                                            {client.document_number}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div>{client.email}</div>
                                            <div className="text-[var(--color-text-secondary)] text-xs mt-0.5">{client.phone}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                client.status === 'ACTIVE' 
                                                ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-strong)] border border-[var(--color-success-default)]/20' 
                                                : 'bg-[var(--color-danger-subtle)] text-[var(--color-danger-strong)] border border-[var(--color-danger-default)]/20'
                                            }`}>
                                                {client.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Button variant="ghost" className="text-[var(--color-primary-default)] hover:bg-[var(--color-primary-subtle)] p-2">
                                                <EditIcon />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-text-secondary)]">
                                            No se encontraron empresas con esos criterios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
