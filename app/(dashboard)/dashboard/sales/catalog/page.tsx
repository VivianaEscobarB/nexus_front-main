"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { UserRole } from "@/types";

function MapIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>;
}
function BeakerIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>;
}
function CheckBadgeIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>;
}

// ----------------------------------------------------------------------
// Mock Data (Aligns with Backend Tables)
// ----------------------------------------------------------------------
const WAREHOUSE_TYPES = [
    { id: "T1", name: "Alimentos (Refrigerado)" },
    { id: "T2", name: "Textil / Seco" },
    { id: "T3", name: "Industrial / Maquinaria" },
    { id: "T4", name: "Farmacéutico" },
];

const MOCK_BODEGAS = [
    { warehouse_id: "B001", code: "ZON-A", name: "Nave Alimentos Principal", available_capacity_m2: 250, total_capacity_m2: 1000, type_id: "T1", address: "Bodega 45, Bloque A" },
    { warehouse_id: "B002", code: "ZON-B", name: "Nave Secos B", available_capacity_m2: 800, total_capacity_m2: 1200, type_id: "T2", address: "Bodega 46, Bloque B" },
    { warehouse_id: "B003", code: "ZON-C", name: "Textiles C", available_capacity_m2: 0, total_capacity_m2: 500, type_id: "T2", address: "Bodega 47, Bloque C" },
    { warehouse_id: "B004", code: "ZON-D", name: "Almacén Industrial", available_capacity_m2: 1500, total_capacity_m2: 2500, type_id: "T3", address: "Bodega 12, P. Industrial" },
    { warehouse_id: "B005", code: "ZON-E", name: "Cámaras Frías", available_capacity_m2: 50, total_capacity_m2: 200, type_id: "T1", address: "Bodega 48, Bloque A" },
];


export default function SalesCatalogPage() {
    const router = useRouter();
    const [filterType, setFilterType] = useState<string>("ALL");
    const [minCapacity, setMinCapacity] = useState<string>("");

    // Filtering logic
    const filteredBodegas = MOCK_BODEGAS.filter(b => {
        const matchesType = filterType === "ALL" || b.type_id === filterType;
        const reqCap = parseInt(minCapacity) || 0;
        const matchesCap = b.available_capacity_m2 >= reqCap;
        return matchesType && matchesCap;
    });

    const getTypeLabel = (id: string) => WAREHOUSE_TYPES.find(t => t.id === id)?.name || "Seco";

    return (
        <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Catálogo de Espacios (Ofertas)</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Consulte la disponibilidad de bodegas y tipos de carga permitida en tiempo real.</p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl shadow-sm">
                <div className="flex-1 w-full">
                    <Select
                        label="Tipo de Carga (Regulada)"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        options={[
                            { value: "ALL", label: "Cualquier Tipo" },
                            ...WAREHOUSE_TYPES.map(t => ({ value: t.id, label: t.name }))
                        ]}
                    />
                </div>
                <div className="flex-1 w-full">
                    <Input
                        label="Área Mínima Requerida (m²)"
                        type="number"
                        min="0"
                        placeholder="Ej. 100"
                        value={minCapacity}
                        onChange={(e) => setMinCapacity(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-auto mt-7">
                    <Button variant="outline" onClick={() => { setFilterType("ALL"); setMinCapacity(""); }}>
                        Limpiar
                    </Button>
                </div>
            </div>

            {/* Capacity KPI Info */}
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-info-subtle)] p-3 rounded-lg border border-[var(--color-info-default)]/30">
                <CheckBadgeIcon />
                <span>
                    Mostrando <strong>{filteredBodegas.length}</strong> opciones de almacenamiento.
                    Tenga en cuenta que no puede ofertar áreas superiores a la capacidad disponible (<strong>available_capacity_m2</strong>).
                </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBodegas.map(bodega => {
                    const isFull = bodega.available_capacity_m2 === 0;
                    const occupancyPct = Math.round(((bodega.total_capacity_m2 - bodega.available_capacity_m2) / bodega.total_capacity_m2) * 100);

                    return (
                        <Card key={bodega.warehouse_id} padding="md" className={`relative overflow-hidden ${isFull ? 'opacity-70' : ''} hover:border-[var(--color-primary-default)] transition-colors cursor-default`}>
                            {/* Type Ribbon */}
                            <div className="absolute top-0 right-0 py-1 px-3 bg-[var(--color-primary-subtle)] text-[var(--color-primary-default)] text-xs font-bold rounded-bl-lg">
                                {getTypeLabel(bodega.type_id)}
                            </div>

                            <CardBody className="space-y-4 pt-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <BeakerIcon />
                                        <h3 className="font-bold text-[var(--color-text-primary)] text-lg">{bodega.name}</h3>
                                    </div>
                                    <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mt-1">
                                        <MapIcon /> {bodega.code} - {bodega.address}
                                    </span>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-2 mt-4 bg-[var(--color-surface-hover)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-semibold text-[var(--color-text-secondary)]">Capacidad Total</span>
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{bodega.total_capacity_m2} m²</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-semibold text-[var(--color-text-secondary)]">Disponible</span>
                                        <span className={`text-lg font-bold ${isFull ? 'text-[var(--color-danger-default)]' : 'text-[var(--color-success-strong)]'}`}>
                                            {bodega.available_capacity_m2} m²
                                        </span>
                                    </div>
                                </div>

                                {/* Visual Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                                        <span>Ocupación</span>
                                        <span>{occupancyPct}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--color-surface-hover)] rounded-full overflow-hidden flex">
                                        <div
                                            className={`h-full ${isFull ? 'bg-[var(--color-danger-default)]' : 'bg-[var(--color-primary-default)]'}`}
                                            style={{ width: `${occupancyPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-2">
                                    <Button
                                        variant={isFull ? "outline" : "primary"}
                                        className="w-full"
                                        disabled={isFull}
                                        onClick={() => router.push(`/dashboard/sales/contracts/create?warehouse_id=${bodega.warehouse_id}`)}
                                    >
                                        {isFull ? "Bodega Sin Disponibilidad" : "Ofertar este Espacio"}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            {filteredBodegas.length === 0 && (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    No se encontraron bodegas que cumplan con la capacidad o tipo requerido.
                </div>
            )}
            </div>
        </RoleGuard>
    );
}
