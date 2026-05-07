"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
    listSectors,
    listSpaces,
    listWarehouses,
    type ManagedSector,
    type ManagedSpace,
    type ManagedWarehouse,
} from "@/modules/infrastructure";

export type StorageSpaceLocationPickerProps = {
    value: string;
    onChange: (next: string) => void;
    label?: string;
    disabled?: boolean;
};

export function StorageSpaceLocationPicker({
    value,
    onChange,
    label = "Espacio de almacenamiento",
    disabled = false,
}: StorageSpaceLocationPickerProps) {
    const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
    const [sectors, setSectors] = useState<ManagedSector[]>([]);
    const [spaces, setSpaces] = useState<ManagedSpace[]>([]);
    const [warehouseId, setWarehouseId] = useState("");
    const [sectorId, setSectorId] = useState("");
    const [spaceId, setSpaceId] = useState("");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void listWarehouses()
            .then((list) => {
                if (!cancelled) {
                    setWarehouses(list.filter((w) => w.active !== false));
                    setLoadError(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError("No se pudieron cargar las bodegas. Usa el modo avanzado o revisa permisos.");
                    setWarehouses([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingWarehouses(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!warehouseId) return;
        let cancelled = false;
        void listSectors({ warehouseId }).then((list) => {
            if (!cancelled) setSectors(list);
        });
        return () => {
            cancelled = true;
        };
    }, [warehouseId]);

    useEffect(() => {
        if (!sectorId) return;
        let cancelled = false;
        void listSpaces({ sectorId }).then((list) => {
            if (!cancelled) setSpaces(list);
        });
        return () => {
            cancelled = true;
        };
    }, [sectorId]);

    const warehouseOptions = useMemo(
        () =>
            warehouses.map((w) => ({
                value: w.id,
                label: `${w.code} · ${w.name}`,
            })),
        [warehouses]
    );

    const sectorOptions = useMemo(() => {
        if (!warehouseId) return [];
        return sectors.map((s) => ({
            value: s.id,
            label: `${s.code} · ${s.name}`,
        }));
    }, [warehouseId, sectors]);

    const spaceOptions = useMemo(() => {
        if (!sectorId) return [];
        return spaces.map((s) => ({
            value: s.id,
            label: `${s.code} · ${s.name} (ID ${s.id})`,
        }));
    }, [sectorId, spaces]);

    function handleWarehouseChange(next: string) {
        setWarehouseId(next);
        setSectorId("");
        setSpaceId("");
        setSectors([]);
        setSpaces([]);
        onChange("");
    }

    function handleSectorChange(next: string) {
        setSectorId(next);
        setSpaceId("");
        setSpaces([]);
        onChange("");
    }

    function handleSpaceChange(next: string) {
        setSpaceId(next);
        onChange(next);
    }

    function handleAdvancedChange(next: string) {
        setWarehouseId("");
        setSectorId("");
        setSpaceId("");
        setSectors([]);
        setSpaces([]);
        onChange(next);
    }

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-text-secondary">{label}</p>
            {loadError ? <p className="text-xs text-warning-strong">{loadError}</p> : null}
            <div className="grid gap-3 sm:grid-cols-3">
                <Select
                    label="Bodega"
                    options={warehouseOptions}
                    value={warehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    disabled={disabled || loadingWarehouses}
                    hint={loadingWarehouses ? "Cargando…" : undefined}
                />
                <Select
                    label="Sector"
                    options={sectorOptions}
                    value={sectorId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    disabled={disabled || !warehouseId || sectorOptions.length === 0}
                    hint={warehouseId && sectorOptions.length === 0 ? "Sin sectores en esta bodega" : undefined}
                />
                <Select
                    label="Espacio"
                    options={spaceOptions}
                    value={spaceId}
                    onChange={(e) => handleSpaceChange(e.target.value)}
                    disabled={disabled || !sectorId || spaceOptions.length === 0}
                    hint={sectorId && spaceOptions.length === 0 ? "Sin espacios en este sector" : undefined}
                />
            </div>
            {value.trim() ? (
                <p className="text-xs text-text-tertiary">
                    ID de espacio enviado al inventario:{" "}
                    <span className="font-mono font-medium text-text-secondary">{value.trim()}</span>
                </p>
            ) : null}

            <details className="rounded-lg border border-border-subtle bg-surface-sunken/40 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-text-secondary">
                    Avanzado: escribir ID numérico del espacio
                </summary>
                <div className="mt-3">
                    <Input
                        label="ID espacio (directo)"
                        value={value}
                        onChange={(e) => handleAdvancedChange(e.target.value)}
                        placeholder="Ej. 42"
                        disabled={disabled}
                    />
                </div>
            </details>
        </div>
    );
}
