"use client";

import * as React from "react";
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/modules/auth";
import {
    createSector,
    createSpace,
    deleteSector,
    deleteSpace,
    listSectors,
    listSpaces,
    updateSector,
    updateSpace,
} from "@/modules/infrastructure";

import type {
    CreateSectorInput,
    CreateSpaceInput,
    CreateWarehouseInput,
    InfrastructureStatus,
    ManagedSector,
    ManagedSpace,
    ManagedWarehouse,
    UpdateSectorInput,
    UpdateSpaceInput,
    UpdateWarehouseInput,
} from "@/modules/infrastructure";
import { useInfrastructureStore } from "@/modules/infrastructure/store/useInfrastructureStore";
import { EmptyState } from "./ui/EmptyState";
import { TotalsHeader } from "./ui/TotalsHeader";
import { WarehouseList } from "./warehouse/WarehouseList";
import { WarehouseFormModal } from "./warehouse/WarehouseFormModal";
import type { CrudMode } from "./types";
import { UserRole } from "@/types";
import { SectorList } from "./sector/SectorList";
import { SectorFormModal } from "./sector/SectorFormModal";
import { SpaceList } from "./space/SpaceList";
import { SpaceFormModal } from "./space/SpaceFormModal";
import { STATUS_VARIANTS, getStatusLabel, formatCapacity, getErrorMessage } from "./utils";

type EditorState =
    | { entity: "warehouse"; mode: CrudMode; warehouse?: ManagedWarehouse }
    | { entity: "sector"; mode: CrudMode; sector?: ManagedSector }
    | { entity: "space"; mode: CrudMode; space?: ManagedSpace }
    | null;
export function InfrastructureManagementView() {
    const { user } = useAuth();
    const role = user?.roles?.[0]?.role_name;
    const isSalesViewer = role === UserRole.SALES_AGENT;
    const isClientViewer = role === UserRole.CLIENT;
    const canManageWarehouses = role === UserRole.ADMIN;
    const canManageStructure =
        role === UserRole.ADMIN || role === UserRole.WAREHOUSE_SUPERVISOR;
    const showsSectorPanel = !isClientViewer;

    // Use global Zustand store for Warehouses
    const { 
        warehouses, 
        isLoading: isWarehousesLoading,
        error: warehousesError,
        fetchWarehouses,
        addWarehouse,
        editWarehouse,
        removeWarehouse
    } = useInfrastructureStore();

    const [sectors, setSectors] = React.useState<ManagedSector[]>([]);
    const [spaces, setSpaces] = React.useState<ManagedSpace[]>([]);
    
    // We keep local loading state for Sectors/Spaces for now
    const [isLoadingOther, setIsLoadingOther] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Derived overall state
    const pageError = warehousesError;

    const [actionError, setActionError] = React.useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string | null>(null);
    const [selectedSectorId, setSelectedSectorId] = React.useState<string | null>(null);
    const [editor, setEditor] = React.useState<EditorState>(null);

    const loadInfrastructure = React.useCallback(async () => {
        setIsLoadingOther(true);

        try {
            await fetchWarehouses();
            
            const [sectorData, spaceData] = await Promise.all([
                listSectors(),
                listSpaces(),
            ]);

            setSectors(sectorData);
            setSpaces(spaceData);
        } catch {
           // Handled by global store or silently
        } finally {
            setIsLoadingOther(false);
        }
    }, [fetchWarehouses]);

    React.useEffect(() => {
        loadInfrastructure();
    }, [loadInfrastructure]);

    React.useEffect(() => {
        if (warehouses.length === 0) {
            setSelectedWarehouseId(null);
            return;
        }

        setSelectedWarehouseId((current) => {
            if (current && warehouses.some((warehouse) => warehouse.id === current)) {
                return current;
            }

            return warehouses[0]?.id ?? null;
        });
    }, [warehouses]);

    const filteredSectors = React.useMemo(() => {
        if (!selectedWarehouseId) {
            return sectors;
        }

        return sectors.filter((sector) => sector.warehouseId === selectedWarehouseId);
    }, [sectors, selectedWarehouseId]);

    React.useEffect(() => {
        if (!showsSectorPanel) {
            setSelectedSectorId(null);
            return;
        }

        if (filteredSectors.length === 0) {
            setSelectedSectorId(null);
            return;
        }

        setSelectedSectorId((current) => {
            if (current && filteredSectors.some((sector) => sector.id === current)) {
                return current;
            }

            return filteredSectors[0]?.id ?? null;
        });
    }, [filteredSectors, showsSectorPanel]);

    const filteredSpaces = React.useMemo(() => {
        return spaces.filter((space) => {
            if (selectedWarehouseId && space.warehouseId !== selectedWarehouseId) {
                return false;
            }

            if (showsSectorPanel && selectedSectorId) {
                return space.sectorId === selectedSectorId;
            }

            return true;
        });
    }, [selectedSectorId, selectedWarehouseId, showsSectorPanel, spaces]);

    const selectedWarehouse = React.useMemo(
        () =>
            warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
            null,
        [selectedWarehouseId, warehouses]
    );

    const selectedSector = React.useMemo(
        () => filteredSectors.find((sector) => sector.id === selectedSectorId) ?? null,
        [filteredSectors, selectedSectorId]
    );

    const totals = React.useMemo(() => {
        const occupiedSpaces = spaces.filter(
            (space) => space.status === "OCCUPIED" || space.status === "RESERVED"
        ).length;

        return {
            warehouses: warehouses.length,
            sectors: sectors.length,
            spaces: spaces.length,
            occupiedSpaces,
        };
    }, [sectors.length, spaces, warehouses.length]);

    function closeEditor() {
        setEditor(null);
        setActionError(null);
    }

    async function runMutation(task: () => Promise<void>, successMessage: string) {
        setIsSubmitting(true);
        setActionError(null);

        try {
            await task();
            closeEditor();
            await loadInfrastructure();
            setFeedbackMessage(successMessage);
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteWarehouseAction(warehouse: ManagedWarehouse) {
        if (
            !window.confirm(
                `Se eliminara la bodega ${warehouse.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        setIsSubmitting(true);
        setActionError(null);
        try {
            await removeWarehouse(warehouse.id);
            setFeedbackMessage("Bodega eliminada correctamente.");
            closeEditor();
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteSectorAction(sector: ManagedSector) {
        if (
            !window.confirm(
                `Se eliminara el sector ${sector.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        await runMutation(
            async () => {
                await deleteSector(sector.id);
            },
            "Sector eliminado correctamente."
        );
    }

    async function handleDeleteSpaceAction(space: ManagedSpace) {
        if (
            !window.confirm(
                `Se eliminara el espacio ${space.name}. Esta accion no se puede deshacer.`
            )
        ) {
            return;
        }

        await runMutation(
            async () => {
                await deleteSpace(space.id);
            },
            "Espacio eliminado correctamente."
        );
    }

    return (
        <RoleGuard
            allowedRoles={[
                UserRole.ADMIN,
                UserRole.WAREHOUSE_SUPERVISOR,
                UserRole.WAREHOUSE_OPERATOR,
                UserRole.SALES_AGENT,
                UserRole.CLIENT,
            ]}
        >
            <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1
                            className="text-3xl font-extrabold tracking-tight"
                            style={{ color: "var(--color-text-primary)" }}
                        >
                            {isClientViewer
                                ? "Disponibilidad de bodegas"
                                : isSalesViewer
                                    ? "Disponibilidad operativa"
                                    : "Infraestructura de bodegas"}
                        </h1>
                        <p
                            className="mt-2 max-w-3xl text-base"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            {isClientViewer
                                ? "Consulta bodegas y espacios disponibles para tu operacion. "
                                : isSalesViewer
                                    ? "Consulta la disponibilidad real de bodegas, sectores y espacios antes de ofertar. "
                                    : "Gestiona la estructura fisica de la operacion. "}
                            {canManageWarehouses
                                ? "Administracion puede modificar bodegas, sectores y espacios."
                                : canManageStructure
                                    ? "Supervision puede operar sectores y espacios, pero no modificar bodegas."
                                    : isSalesViewer
                                        ? "Ventas puede consultar bodegas, sectores y espacios sin capacidad de edicion."
                                        : isClientViewer
                                            ? "Cliente puede consultar bodegas y espacios sin capacidad de edicion."
                                            : "Operacion puede consultar bodegas, sectores y espacios sin capacidad de edicion."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            label={
                                canManageWarehouses
                                    ? "Control total"
                                    : canManageStructure
                                        ? "Bodegas en solo lectura"
                                        : isSalesViewer
                                            ? "Consulta comercial"
                                            : isClientViewer
                                                ? "Disponibilidad cliente"
                                                : "Consulta operativa"
                            }
                            variant={
                                canManageWarehouses
                                    ? "danger"
                                    : canManageStructure
                                        ? "info"
                                        : isSalesViewer
                                            ? "brand"
                                            : "neutral"
                            }
                        />
                        {canManageWarehouses ? (
                            <Button
                                onClick={() => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "warehouse",
                                        mode: "create",
                                    });
                                }}
                            >
                                Nueva bodega
                            </Button>
                        ) : null}
                        <Button variant="outline" onClick={() => loadInfrastructure()}>
                            Recargar
                        </Button>
                    </div>
                </div>

                {feedbackMessage ? (
                    <div className="rounded-xl border border-[var(--color-success-strong)] bg-[var(--color-success-subtle)] px-4 py-3 text-sm text-[var(--color-success-strong)]">
                        {feedbackMessage}
                    </div>
                ) : null}

                {pageError ? (
                    <Card>
                        <CardBody className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-danger-strong)]">
                                    No fue posible cargar la infraestructura
                                </h2>
                                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                                    {pageError}
                                </p>
                            </div>
                            <Button onClick={() => loadInfrastructure()}>
                                Intentar nuevamente
                            </Button>
                        </CardBody>
                    </Card>
                ) : null}

                {!pageError ? (
                    <>
                        <TotalsHeader totals={totals} />

                        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                            <WarehouseList
                                warehouses={warehouses}
                                isLoading={isWarehousesLoading}
                                pageError={pageError}
                                selectedWarehouseId={selectedWarehouseId}
                                canManageWarehouses={canManageWarehouses}
                                onSelect={setSelectedWarehouseId}
                                onCreate={() => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "warehouse",
                                        mode: "create",
                                    });
                                }}
                                onEdit={(warehouse) => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "warehouse",
                                        mode: "edit",
                                        warehouse,
                                    });
                                }}
                                onDelete={(warehouse) => {
                                    void handleDeleteWarehouseAction(warehouse);
                                }}
                            />

                            <Card>
                                <CardHeader
                                    title="Detalle operativo"
                                    description={
                                        isClientViewer
                                            ? "Resumen de disponibilidad para la bodega seleccionada."
                                            : "Resumen del contexto sobre el que se esta trabajando."
                                    }
                                />
                                <CardBody className="space-y-4">
                                    {selectedWarehouse ? (
                                        <>
                                            <div className="rounded-2xl bg-[var(--color-surface-hover)] p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                                    Bodega activa
                                                </p>
                                                <h3 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                                                    {selectedWarehouse.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                                    {selectedWarehouse.address}
                                                </p>
                                                <div className="mt-4 grid gap-3 text-sm text-[var(--color-text-secondary)]">
                                                    <div className="flex items-center justify-between">
                                                        <span>Sectores visibles</span>
                                                        <strong className="text-[var(--color-text-primary)]">
                                                            {filteredSectors.length}
                                                        </strong>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Espacios visibles</span>
                                                        <strong className="text-[var(--color-text-primary)]">
                                                            {filteredSpaces.length}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-[var(--color-border-subtle)] p-4">
                                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                    Permisos activos para este rol
                                                </p>
                                                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                                                    <li>
                                                        {canManageWarehouses
                                                            ? "Puede crear, editar y eliminar bodegas."
                                                            : "Puede consultar bodegas, pero no modificar sus datos base."}
                                                    </li>
                                                    <li>
                                                        {canManageStructure
                                                            ? "Puede crear, editar y eliminar sectores."
                                                            : isClientViewer
                                                                ? "La consulta se concentra en la disponibilidad de espacios por bodega."
                                                                : "Puede consultar sectores, pero no modificarlos."}
                                                    </li>
                                                    <li>
                                                        {canManageStructure
                                                            ? "Puede crear, editar y eliminar espacios."
                                                            : "Puede consultar espacios, pero no modificarlos."}
                                                    </li>
                                                </ul>
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState
                                            title="Selecciona una bodega"
                                            description="El detalle operativo aparece cuando eliges una bodega de trabajo."
                                        />
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">
                            {showsSectorPanel ? (
                                <SectorList
                                    sectors={filteredSectors}
                                    selectedSectorId={selectedSectorId}
                                    selectedWarehouse={selectedWarehouse ?? null}
                                    canManageStructure={canManageStructure}
                                    onSelect={(sectorId) => {
                                        setSelectedSectorId(sectorId);
                                        setFeedbackMessage(null);
                                    }}
                                    onCreate={() => {
                                        setFeedbackMessage(null);
                                        setEditor({
                                            entity: "sector",
                                            mode: "create",
                                        });
                                    }}
                                    onEdit={(sector) => {
                                        setFeedbackMessage(null);
                                        setEditor({
                                            entity: "sector",
                                            mode: "edit",
                                            sector,
                                        });
                                    }}
                                    onDelete={(sector) => {
                                        void handleDeleteSectorAction(sector);
                                    }}
                                />
                            ) : null}

                            <SpaceList
                                spaces={filteredSpaces}
                                selectedWarehouse={selectedWarehouse ?? null}
                                selectedSector={selectedSector ?? null}
                                showsSectorPanel={showsSectorPanel}
                                isClientViewer={isClientViewer}
                                canManageStructure={canManageStructure}
                                onCreate={() => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "space",
                                        mode: "create",
                                    });
                                }}
                                onEdit={(space) => {
                                    setFeedbackMessage(null);
                                    setEditor({
                                        entity: "space",
                                        mode: "edit",
                                        space,
                                    });
                                }}
                                onDelete={(space) => {
                                    void handleDeleteSpaceAction(space);
                                }}
                            />
                        </div>
                    </>
                ) : null}

                <WarehouseFormModal
                    isOpen={editor?.entity === "warehouse"}
                    mode={editor?.entity === "warehouse" ? editor.mode : "create"}
                    warehouse={
                        editor?.entity === "warehouse" ? editor.warehouse : undefined
                    }
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        setIsSubmitting(true);
                        setActionError(null);
                        try {
                            if (editor?.entity === "warehouse" && editor.mode === "edit" && editor.warehouse) {
                                await editWarehouse(editor.warehouse.id, values as UpdateWarehouseInput);
                                setFeedbackMessage("Bodega actualizada correctamente.");
                            } else {
                                await addWarehouse(values as CreateWarehouseInput);
                                setFeedbackMessage("Bodega creada correctamente.");
                            }
                            closeEditor();
                        } catch (error) {
                            setActionError(getErrorMessage(error));
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />

                <SectorFormModal
                    isOpen={editor?.entity === "sector"}
                    mode={editor?.entity === "sector" ? editor.mode : "create"}
                    sector={editor?.entity === "sector" ? editor.sector : undefined}
                    warehouses={warehouses}
                    defaultWarehouseId={selectedWarehouseId}
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        await runMutation(
                            async () => {
                                if (
                                    editor?.entity === "sector" &&
                                    editor.mode === "edit" &&
                                    editor.sector
                                ) {
                                    await updateSector(
                                        editor.sector.id,
                                        values as UpdateSectorInput
                                    );
                                    return;
                                }

                                await createSector(values as CreateSectorInput);
                            },
                            editor?.entity === "sector" && editor.mode === "edit"
                                ? "Sector actualizado correctamente."
                                : "Sector creado correctamente."
                        );
                    }}
                />

                <SpaceFormModal
                    isOpen={editor?.entity === "space"}
                    mode={editor?.entity === "space" ? editor.mode : "create"}
                    space={editor?.entity === "space" ? editor.space : undefined}
                    warehouses={warehouses}
                    sectors={filteredSectors}
                    defaultWarehouseId={selectedWarehouseId}
                    defaultSectorId={selectedSectorId}
                    isSubmitting={isSubmitting}
                    actionError={actionError}
                    onClose={closeEditor}
                    onSubmit={async (values) => {
                        await runMutation(
                            async () => {
                                if (
                                    editor?.entity === "space" &&
                                    editor.mode === "edit" &&
                                    editor.space
                                ) {
                                    await updateSpace(
                                        editor.space.id,
                                        values as UpdateSpaceInput
                                    );
                                    return;
                                }

                                await createSpace(values as CreateSpaceInput);
                            },
                            editor?.entity === "space" && editor.mode === "edit"
                                ? "Espacio actualizado correctamente."
                                : "Espacio creado correctamente."
                        );
                    }}
                />
            </div>
        </RoleGuard>
    );
}
