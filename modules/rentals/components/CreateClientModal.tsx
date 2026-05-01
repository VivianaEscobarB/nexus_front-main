"use client";

import React, { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { useCreateClient } from "../hooks/useCreateClient";
import type { Client } from "../types/Client";

export interface CreateClientModalProps {
    onClose: () => void;
    onCreated: (client: Client) => void;
}

export function CreateClientModal({ onClose, onCreated }: CreateClientModalProps) {
    const { createClient, isLoading, error } = useCreateClient();
    
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");

    const isFormValid = name.trim().length > 0 && documentNumber.trim().length > 0;

    const handleSave = async () => {
        if (!isFormValid) return;
        const newClient = await createClient({ name, email, phone, documentNumber });
        if (newClient) {
            onCreated(newClient);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-xl bg-[var(--color-surface-overlay)] shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-[var(--color-border-subtle)]">
                    <h2 className="text-xl font-bold">Crear Nuevo Cliente</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Registra rápidamente un prospecto comercial.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {error ? (
                        <Alert variant="danger" className="rounded-lg">
                            {error}
                        </Alert>
                    ) : null}
                    
                    <Input label="Nombre de Empresa / Comercial *" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
                    <Input label="Documento (NIT / CC) *" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} disabled={isLoading} />
                    <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                    <Input label="Teléfono" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
                </div>
                
                <div className="p-6 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] flex justify-end gap-3 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={isLoading} disabled={!isFormValid || isLoading}>Guardar Cliente</Button>
                </div>
            </div>
        </div>
    );
}
