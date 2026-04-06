"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

// Imagen de sprite de Freepik que el usuario descargó
const AVATAR_SPRITE_URL = "/avatars-sprite.jpg";
const AVATAR_BG_SIZE = "380% 255%"; // Escala para hacer zoom en los rostros

// Offsets ajustados matemáticamente para encuadrar los rostros en el círculo
const AVATAR_POSITIONS = [
    "5% 9%",
    "50% 9%",
    "95% 9%",
    "5% 91%",
    "50% 91%",
    "95% 91%",
];

interface UserProfileData {
    name: string;
    email: string;
    avatarUrl: string;
}

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: UserProfileData) => void;
}

export function UserProfileModal({ isOpen, onClose, onSave }: UserProfileModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserProfileData>({
        name: "",
        email: "",
        avatarUrl: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchUserData();
        } else {
            // Reset state when closed
            setIsEditing(false);
            setError(null);
        }
    }, [isOpen]);

    const fetchUserData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/user");
            if (!res.ok) throw new Error("Error al obtener los datos");
            const data = await res.json();
            
            // Garantizar compatibilidad con datos anteriores si es necesario
            setUserData({
                name: data.name || "",
                email: data.email || "",
                avatarUrl: data.avatarUrl || "",
            });
        } catch (err) {
            setError("No se pudieron cargar los datos del usuario.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!userData.name.trim() || !userData.email.trim()) {
            setError("El nombre y el email son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });
            if (!res.ok) throw new Error("Error al guardar los datos");
            if (onSave) onSave(userData);
            setIsEditing(false);
        } catch (err) {
            setError("Hubo un problema al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserData((prev) => ({ ...prev, [name]: value }));
    };

    const selectAvatar = (url: string) => {
        if (!isEditing) return;
        setUserData((prev) => ({ ...prev, avatarUrl: url }));
    };

    const content = isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="w-12 h-12 border-4 border-t-transparent border-[var(--color-primary-default)] rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Cargando perfil...</p>
        </div>
    ) : (
        <div className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-[var(--color-danger-strong)] bg-[var(--color-danger-subtle)] border border-[var(--color-danger-default)] rounded-lg">
                    {error}
                </div>
            )}
            
            {/* Cabecera del Perfil visual */}
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative">
                    {userData.avatarUrl ? (
                         <div 
                            className="w-24 h-24 rounded-full border-4 border-[var(--color-surface-hover)] shadow-md transition-transform duration-300"
                            style={{ 
                                backgroundImage: `url(${AVATAR_SPRITE_URL})`,
                                backgroundSize: AVATAR_BG_SIZE,
                                backgroundPosition: userData.avatarUrl,
                                backgroundColor: 'var(--color-surface-hover)'
                            }}
                         />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-brand-strong)] to-[var(--color-primary-default)] text-[var(--color-text-inverse)] flex items-center justify-center text-3xl font-bold shadow-md">
                            {userData.name.charAt(0)?.toUpperCase() || "U"}
                        </div>
                    )}
                </div>
                {!isEditing && (
                    <div className="text-center">
                        <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">{userData.name || "Usuario"}</h3>
                        <p className="text-sm text-[var(--color-text-tertiary)]">{userData.email}</p>
                    </div>
                )}
            </div>

            {/* Selección de Avatar (Solo en modo edición) */}
            {isEditing && (
                <div className="space-y-3 p-4 bg-[var(--color-surface-sunken)] rounded-xl border border-[var(--color-border-subtle)]">
                    <Label className="text-sm font-semibold">Elige tu Avatar</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {AVATAR_POSITIONS.map((position, idx) => {
                            const isSelected = userData.avatarUrl === position;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => selectAvatar(position)}
                                    className={`relative rounded-full aspect-square overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-default)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-sunken)] bg-white
                                        ${isSelected ? "ring-4 ring-[var(--color-primary-default)] shadow-lg scale-105" : "border-2 border-transparent hover:border-[var(--color-border-focus)] opacity-80 hover:opacity-100"}
                                    `}
                                    title={`Seleccionar avatar ${idx + 1}`}
                                >
                                    <div 
                                        className="w-full h-full rounded-full" 
                                        style={{ 
                                            backgroundImage: `url(${AVATAR_SPRITE_URL})`,
                                            backgroundSize: AVATAR_BG_SIZE,
                                            backgroundPosition: position,
                                            backgroundColor: 'var(--color-surface-hover)'
                                        }}
                                    />
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-black/10 rounded-full pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="text-right mt-2">
                         <span className="text-[10px] text-[var(--color-text-tertiary)] opacity-60 hover:opacity-100 transition-opacity">
                            Autor: <a href="https://www.freepik.es/vector-gratis/pack-iconos-perfil-dibujados-mano_18262438.htm" target="_blank" rel="noopener noreferrer" className="underline">Imagen de pikisuperstar en Freepik</a>
                         </span>
                    </div>
                </div>
            )}

            {/* Campos de Texto */}
            {isEditing && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input
                            id="name"
                            name="name"
                            value={userData.name}
                            onChange={handleChange}
                            placeholder="Ej: Viviana E"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={userData.email}
                            onChange={handleChange}
                            placeholder="ejemplo@nexus.com"
                        />
                    </div>
                </div>
            )}
        </div>
    );

    const footer = isLoading ? null : (
        <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cerrar
            </Button>
            {isEditing ? (
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            ) : (
                <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Editar Perfil" : "Perfil de Usuario"}
            description="Administra tu información personal y opciones de cuenta."
            footer={footer}
            size="md"
        >
            {content}
        </Modal>
    );
}
