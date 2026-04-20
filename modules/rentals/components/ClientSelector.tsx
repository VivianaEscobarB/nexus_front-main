"use client";

import React, { useState, useEffect } from "react";
import type { Client } from "../types/Client";
import { useClients } from "../hooks/useClients";
import { Input, Button, Card, CardBody } from "@/components/ui";

export interface ClientSelectorProps {
    selectedClient: Client | null;
    onSelectClient: (client: Client | null) => void;
    onCreateClient: () => void;
}

export function ClientSelector({ selectedClient, onSelectClient, onCreateClient }: ClientSelectorProps) {
    const { clients, searchClients, isLoading } = useClients();
    const [searchTerm, setSearchTerm] = useState("");

    // Efecto simple para buscar clientes (alfa sin debounce completo para este refactor)
    useEffect(() => {
        searchClients(searchTerm);
    }, [searchTerm, searchClients]);

    const handleClear = () => {
        setSearchTerm("");
        onSelectClient(null);
    };

    return (
        <Card className="border-l-4 border-l-[var(--color-info-default)] mb-6 overflow-visible">
            <CardBody className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    
                    {selectedClient ? (
                        <div className="flex-1 w-full bg-[var(--color-surface-hover)] p-4 rounded-xl border border-[var(--color-border-subtle)] flex items-center justify-between">
                            <div>
                                <p className="font-bold text-[var(--color-text-primary)]">{selectedClient.name}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Doc: {selectedClient.documentNumber || "N/A"}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleClear}>Cambiar Cliente</Button>
                        </div>
                    ) : (
                        <div className="flex-1 w-full relative z-20">
                            <Input
                                label="Buscar o Seleccionar Cliente"
                                placeholder="Escribe el nombre o documento..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            
                            {/* Dropdown flotante (simplificado para el mock) */}
                            {searchTerm.length > 0 && !isLoading && (
                                <ul className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xl max-h-56 overflow-y-auto">
                                    {clients.length === 0 ? (
                                        <li className="p-3 text-sm text-[var(--color-text-tertiary)]">Sin resultados...</li>
                                    ) : (
                                        clients.map(c => (
                                            <li
                                                key={c.id}
                                                className="p-3 border-b border-[var(--color-border-subtle)] last:border-b-0 hover:bg-[var(--color-surface-hover)] cursor-pointer text-sm text-[var(--color-text-primary)]"
                                                onClick={() => {
                                                    onSelectClient(c);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <span className="font-bold">{c.name}</span>
                                                <span className="text-[var(--color-text-secondary)] block text-xs">Doc: {c.documentNumber}</span>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                    
                    {!selectedClient && (
                        <div className="flex-none">
                            <Button variant="outline" onClick={onCreateClient}>
                                + Crear Cliente
                            </Button>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}
