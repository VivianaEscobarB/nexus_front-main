"use client";

import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { RoleGuard } from "@/modules/auth";
import { UserRole } from "@/types";
import {
    createEntityType,
    createStatusCatalog,
    deleteEntityType,
    deleteStatusCatalog,
    listEntityTypes,
    listStatusCatalogs,
    type StatusCatalog,
    type EntityTypeCatalog,
    updateEntityType,
    updateStatusCatalog,
} from "@/modules/infrastructure";
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    Modal,
    Pagination,
    Select,
} from "@/components/ui";
import { isApiError } from "@/shared/api/apiError";
import { usePagination } from "@/shared/hooks/usePagination";

const statusFormSchema = z.object({
    code: z.string().min(2, "Código requerido"),
    description: z.string().min(2, "Descripción requerida"),
    color: z
        .string()
        .min(4, "Color requerido")
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color inválido"),
    isOperational: z.enum(["true", "false"]),
    entityTypeId: z.string().min(1, "Selecciona una entidad"),
});

const entityTypeFormSchema = z.object({
    name: z.string().min(2, "Nombre requerido"),
    description: z.string().optional(),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;
type EntityTypeFormValues = z.infer<typeof entityTypeFormSchema>;
const STATUS_PAGE_SIZE = 8;

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible completar la operación.";
}

export default function StatusManagementPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmittingStatus, setIsSubmittingStatus] = React.useState(false);
    const [isSubmittingEntityType, setIsSubmittingEntityType] = React.useState(false);
    const [isDeletingStatusId, setIsDeletingStatusId] = React.useState<number | null>(null);
    const [isDeletingEntityTypeId, setIsDeletingEntityTypeId] = React.useState<number | null>(
        null
    );
    const [editingStatusId, setEditingStatusId] = React.useState<number | null>(null);
    const [editingEntityTypeId, setEditingEntityTypeId] = React.useState<number | null>(null);
    const [feedback, setFeedback] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [statuses, setStatuses] = React.useState<StatusCatalog[]>([]);
    const [entityTypes, setEntityTypes] = React.useState<EntityTypeCatalog[]>([]);
    const [activeCreationForm, setActiveCreationForm] = React.useState<"entityType" | "status">(
        "status"
    );
    const [statusEntityFilterId, setStatusEntityFilterId] = React.useState<string>("all");
    const [statusSearchInput, setStatusSearchInput] = React.useState("");
    const [statusSearchTerm, setStatusSearchTerm] = React.useState("");
    const [isEntityTypeModalOpen, setIsEntityTypeModalOpen] = React.useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
    const [pendingStatusDelete, setPendingStatusDelete] =
        React.useState<StatusCatalog | null>(null);
    const [pendingEntityTypeDelete, setPendingEntityTypeDelete] =
        React.useState<EntityTypeCatalog | null>(null);

    const statusForm = useForm<StatusFormValues>({
        resolver: zodResolver(statusFormSchema),
        defaultValues: {
            code: "",
            description: "",
            color: "#22C55E",
            isOperational: "true",
            entityTypeId: "",
        },
    });

    const entityTypeForm = useForm<EntityTypeFormValues>({
        resolver: zodResolver(entityTypeFormSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const loadCatalogs = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [entityTypeData, statusData] = await Promise.all([
                listEntityTypes(),
                listStatusCatalogs(),
            ]);
            setEntityTypes(entityTypeData);
            setStatuses(statusData);
            if (!editingStatusId && entityTypeData.length > 0) {
                statusForm.setValue("entityTypeId", String(entityTypeData[0].id));
            }
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setIsLoading(false);
        }
    }, [editingStatusId, statusForm]);

    React.useEffect(() => {
        void loadCatalogs();
    }, [loadCatalogs]);

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            setStatusSearchTerm(statusSearchInput.trim().toLowerCase());
        }, 250);
        return () => window.clearTimeout(timer);
    }, [statusSearchInput]);

    const onSubmitStatus = statusForm.handleSubmit(async (values) => {
        setIsSubmittingStatus(true);
        setError(null);
        setFeedback(null);
        try {
            if (editingStatusId) {
                await updateStatusCatalog(editingStatusId, {
                    code: values.code,
                    description: values.description,
                    color: values.color,
                    isOperational: values.isOperational === "true",
                    entityTypeId: Number(values.entityTypeId),
                });
                setFeedback("Estado actualizado correctamente.");
            } else {
                await createStatusCatalog({
                    code: values.code,
                    description: values.description,
                    color: values.color,
                    isOperational: values.isOperational === "true",
                    entityTypeId: Number(values.entityTypeId),
                });
                setFeedback("Estado creado correctamente.");
            }
            setEditingStatusId(null);
            setIsStatusModalOpen(false);
            statusForm.reset({
                code: "",
                description: "",
                color: values.color,
                isOperational: "true",
                entityTypeId: values.entityTypeId,
            });
            await loadCatalogs();
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally {
            setIsSubmittingStatus(false);
        }
    });

    const onSubmitEntityType = entityTypeForm.handleSubmit(async (values) => {
        setIsSubmittingEntityType(true);
        setError(null);
        setFeedback(null);
        try {
            if (editingEntityTypeId) {
                await updateEntityType(editingEntityTypeId, {
                    name: values.name,
                    description: values.description,
                });
                setFeedback("Tipo de entidad actualizado correctamente.");
            } else {
                await createEntityType({
                    name: values.name,
                    description: values.description,
                });
                setFeedback("Tipo de entidad creado correctamente.");
            }
            setEditingEntityTypeId(null);
            setIsEntityTypeModalOpen(false);
            entityTypeForm.reset({ name: "", description: "" });
            await loadCatalogs();
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally {
            setIsSubmittingEntityType(false);
        }
    });

    const statusRowsByEntity = React.useMemo(() => {
        const rows: Record<number, StatusCatalog[]> = {};
        for (const status of statuses) {
            const entityTypeId = status.entityTypeId ?? 0;
            if (!rows[entityTypeId]) rows[entityTypeId] = [];
            rows[entityTypeId].push(status);
        }
        return rows;
    }, [statuses]);

    const statusCountByEntityType = React.useMemo(() => {
        const countMap = new Map<number, number>();
        for (const status of statuses) {
            const entityTypeId = status.entityTypeId ?? 0;
            countMap.set(entityTypeId, (countMap.get(entityTypeId) ?? 0) + 1);
        }
        return countMap;
    }, [statuses]);

    const onEditStatus = React.useCallback(
        (status: StatusCatalog) => {
            setActiveCreationForm("status");
            setEditingStatusId(status.id);
            statusForm.reset({
                code: status.code ?? "",
                description: status.description ?? status.name ?? "",
                color: status.color ?? "#22C55E",
                isOperational: String(status.isOperational ?? true) as "true" | "false",
                entityTypeId: String(status.entityTypeId ?? ""),
            });
            setIsStatusModalOpen(true);
        },
        [statusForm]
    );

    const onEditEntityType = React.useCallback(
        (entityType: EntityTypeCatalog) => {
            setActiveCreationForm("entityType");
            setEditingEntityTypeId(entityType.id);
            entityTypeForm.reset({
                name: entityType.name,
                description: entityType.description ?? "",
            });
            setIsEntityTypeModalOpen(true);
        },
        [entityTypeForm]
    );

    const requestDeleteStatus = React.useCallback((status: StatusCatalog) => {
        setPendingStatusDelete(status);
    }, []);

    const confirmDeleteStatus = React.useCallback(async () => {
        const status = pendingStatusDelete;
        if (!status) {
            return;
        }
        setIsDeletingStatusId(status.id);
        setError(null);
        setFeedback(null);
        try {
            await deleteStatusCatalog(status.id);
            setFeedback("Estado eliminado correctamente.");
            if (editingStatusId === status.id) {
                setEditingStatusId(null);
                statusForm.reset({
                    code: "",
                    description: "",
                    color: "#22C55E",
                    isOperational: "true",
                    entityTypeId:
                        entityTypes.length > 0 ? String(entityTypes[0].id) : "",
                });
            }
            await loadCatalogs();
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setIsDeletingStatusId(null);
            setPendingStatusDelete(null);
        }
    }, [editingStatusId, entityTypes, loadCatalogs, pendingStatusDelete, statusForm]);

    const requestDeleteEntityType = React.useCallback(
        (entityType: EntityTypeCatalog) => {
            const usageCount = statusCountByEntityType.get(entityType.id) ?? 0;
            if (usageCount > 0) {
                setError(
                    `No se puede eliminar ${entityType.name} porque tiene ${usageCount} estado(s) asociado(s).`
                );
                return;
            }
            setPendingEntityTypeDelete(entityType);
        },
        [statusCountByEntityType]
    );

    const confirmDeleteEntityType = React.useCallback(async () => {
        const entityType = pendingEntityTypeDelete;
        if (!entityType) {
            return;
        }
        setIsDeletingEntityTypeId(entityType.id);
        setError(null);
        setFeedback(null);
        try {
            await deleteEntityType(entityType.id);
            setFeedback("Tipo de entidad eliminado correctamente.");
            if (editingEntityTypeId === entityType.id) {
                setEditingEntityTypeId(null);
                entityTypeForm.reset({ name: "", description: "" });
            }
            await loadCatalogs();
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setIsDeletingEntityTypeId(null);
            setPendingEntityTypeDelete(null);
        }
    }, [editingEntityTypeId, entityTypeForm, loadCatalogs, pendingEntityTypeDelete]);

    const cancelStatusEditing = React.useCallback(() => {
        setEditingStatusId(null);
        setIsStatusModalOpen(false);
        statusForm.reset({
            code: "",
            description: "",
            color: "#22C55E",
            isOperational: "true",
            entityTypeId: entityTypes.length > 0 ? String(entityTypes[0].id) : "",
        });
    }, [entityTypes, statusForm]);

    const cancelEntityTypeEditing = React.useCallback(() => {
        setEditingEntityTypeId(null);
        setIsEntityTypeModalOpen(false);
        entityTypeForm.reset({ name: "", description: "" });
    }, [entityTypeForm]);

    const statusEntityTypeNameById = React.useMemo(() => {
        const map = new Map<number, string>();
        for (const entityType of entityTypes) {
            map.set(entityType.id, entityType.name);
        }
        return map;
    }, [entityTypes]);

    const filteredStatuses = React.useMemo(() => {
        const byEntity =
            statusEntityFilterId === "all"
                ? statuses
                : statuses.filter(
                      (status) => String(status.entityTypeId ?? "") === statusEntityFilterId
                  );

        if (!statusSearchTerm) return byEntity;

        return byEntity.filter((status) => {
            const haystack = [
                status.code ?? "",
                status.description ?? "",
                status.name ?? "",
                status.color ?? "",
                status.entityTypeId
                    ? statusEntityTypeNameById.get(status.entityTypeId) ?? ""
                    : "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(statusSearchTerm);
        });
    }, [statusEntityFilterId, statuses, statusSearchTerm, statusEntityTypeNameById]);

    const {
        paginatedData: paginatedStatuses,
        currentPage: statusPage,
        totalPages: statusTotalPages,
        goToPage: goToStatusPage,
        totalItems: statusTotalItems,
    } = usePagination(filteredStatuses, STATUS_PAGE_SIZE);

    const {
        register,
        formState: { errors },
    } = statusForm;

    return (
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <div className="mx-auto max-w-7xl space-y-6">
                {feedback ? <Alert variant="success">{feedback}</Alert> : null}
                {error ? <Alert variant="danger">{error}</Alert> : null}

                <Card>
                    <CardHeader
                        title="Acciones de creación"
                        description="Mantén un solo punto de alta para tipos de entidad y estados."
                    />
                    <CardBody className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={activeCreationForm === "entityType" ? "primary" : "outline"}
                            onClick={() => {
                                setActiveCreationForm("entityType");
                                setEditingEntityTypeId(null);
                                entityTypeForm.reset({ name: "", description: "" });
                                setIsEntityTypeModalOpen(true);
                            }}
                        >
                            Nuevo tipo de entidad
                        </Button>
                        <Button
                            size="sm"
                            variant={activeCreationForm === "status" ? "primary" : "outline"}
                            onClick={() => {
                                setActiveCreationForm("status");
                                setEditingStatusId(null);
                                statusForm.reset({
                                    code: "",
                                    description: "",
                                    color: "#22C55E",
                                    isOperational: "true",
                                    entityTypeId:
                                        entityTypes.length > 0 ? String(entityTypes[0].id) : "",
                                });
                                setIsStatusModalOpen(true);
                            }}
                            disabled={entityTypes.length === 0}
                        >
                            Nuevo estado
                        </Button>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Tipos registrados"
                        description="Base para asociar estados por entidad. Solo puedes eliminar tipos sin estados asociados."
                        action={
                            <Button variant="secondary" size="sm" onClick={() => loadCatalogs()}>
                                Recargar
                            </Button>
                        }
                    />
                    <CardBody>
                        {isLoading ? (
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Cargando tipos de entidad...
                            </p>
                        ) : entityTypes.length === 0 ? (
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                                No hay tipos de entidad registrados.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">ID</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">
                                                Nombre
                                            </th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">
                                                Descripción
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                        {entityTypes.map((entityType) => (
                                            <tr key={entityType.id}>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {entityType.id}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {entityType.name}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                    {entityType.description ?? "Sin descripción"}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() =>
                                                                onEditEntityType(entityType)
                                                            }
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() =>
                                                                requestDeleteEntityType(entityType)
                                                            }
                                                            title={
                                                                (statusCountByEntityType.get(
                                                                    entityType.id
                                                                ) ?? 0) > 0
                                                                    ? "Elimina primero los estados asociados"
                                                                    : "Eliminar tipo de entidad"
                                                            }
                                                            disabled={
                                                                (statusCountByEntityType.get(
                                                                    entityType.id
                                                                ) ?? 0) > 0 ||
                                                                isDeletingEntityTypeId ===
                                                                entityType.id
                                                            }
                                                            isLoading={
                                                                isDeletingEntityTypeId ===
                                                                entityType.id
                                                            }
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Estados registrados"
                        description="Filtra por tipo de entidad y pagina automáticamente cuando el listado supera 8 registros."
                        action={
                            <div className="flex items-center gap-2">
                                <div className="w-64">
                                    <Input
                                        label="Buscar estado"
                                        placeholder="Código, descripción o color"
                                        value={statusSearchInput}
                                        onChange={(event) =>
                                            setStatusSearchInput(event.target.value)
                                        }
                                    />
                                </div>
                                <div className="w-56">
                                    <Select
                                        label="Tipo de entidad"
                                        value={statusEntityFilterId}
                                        onChange={(event) => setStatusEntityFilterId(event.target.value)}
                                        options={[
                                            { value: "all", label: "Todos" },
                                            ...entityTypes.map((entity) => ({
                                                value: String(entity.id),
                                                label: entity.name,
                                            })),
                                        ]}
                                    />
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => loadCatalogs()}>
                                    Recargar
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="space-y-3">
                        {isLoading ? (
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Cargando estados...
                            </p>
                        ) : filteredStatuses.length === 0 ? (
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                                No hay estados para el filtro seleccionado.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Código</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Descripción</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Entidad</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Color</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase">Operativo</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                        {paginatedStatuses.map((status) => (
                                            <tr key={status.id}>
                                                <td className="px-4 py-3">
                                                    <Badge label={status.code ?? "SIN_CODIGO"} variant="neutral" />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-primary)]">
                                                    {status.description ?? status.name}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                    {status.entityTypeId
                                                        ? (statusEntityTypeNameById.get(status.entityTypeId) ??
                                                          `ID ${status.entityTypeId}`)
                                                        : "Sin entidad"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-3 w-3 rounded-full border border-[var(--color-border-default)]"
                                                            style={{
                                                                backgroundColor:
                                                                    status.color ??
                                                                    "var(--color-surface-hover)",
                                                            }}
                                                            aria-hidden="true"
                                                        />
                                                        <span className="text-xs text-[var(--color-text-tertiary)]">
                                                            {status.color ?? "Sin color"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                    {status.isOperational ? "Sí" : "No"}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => onEditStatus(status)}
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => requestDeleteStatus(status)}
                                                            disabled={isDeletingStatusId === status.id}
                                                            isLoading={isDeletingStatusId === status.id}
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!isLoading && statusTotalItems > 0 ? (
                            <div className="space-y-1">
                                <p className="text-center text-xs text-[var(--color-text-tertiary)]">
                                    Mostrando {(statusPage - 1) * STATUS_PAGE_SIZE + 1}–
                                    {Math.min(statusPage * STATUS_PAGE_SIZE, statusTotalItems)} de{" "}
                                    {statusTotalItems}
                                </p>
                                <Pagination
                                    currentPage={statusPage}
                                    totalPages={statusTotalPages}
                                    onPageChange={goToStatusPage}
                                    className="py-1"
                                />
                            </div>
                        ) : null}
                    </CardBody>
                </Card>

                <Modal
                    isOpen={isEntityTypeModalOpen}
                    onClose={cancelEntityTypeEditing}
                    closeOnBackdrop={!isSubmittingEntityType}
                    title={
                        editingEntityTypeId
                            ? "Editar tipo de entidad"
                            : "Nuevo tipo de entidad"
                    }
                    description="Registra o ajusta tipos de entidad para el catálogo maestro."
                    size="lg"
                    footer={
                        <div className="flex w-full justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={cancelEntityTypeEditing}
                                disabled={isSubmittingEntityType}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void onSubmitEntityType()}
                                disabled={isSubmittingEntityType}
                                isLoading={isSubmittingEntityType}
                            >
                                {editingEntityTypeId ? "Actualizar tipo" : "Crear tipo"}
                            </Button>
                        </div>
                    }
                >
                    <form
                        onSubmit={onSubmitEntityType}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <Input
                            label="Nombre"
                            placeholder="Ej: WAREHOUSE"
                            error={entityTypeForm.formState.errors.name?.message}
                            {...entityTypeForm.register("name")}
                        />
                        <Input
                            label="Descripción"
                            placeholder="Ej: Estados para bodegas"
                            error={entityTypeForm.formState.errors.description?.message}
                            {...entityTypeForm.register("description")}
                        />
                    </form>
                </Modal>

                <Modal
                    isOpen={isStatusModalOpen}
                    onClose={cancelStatusEditing}
                    closeOnBackdrop={!isSubmittingStatus}
                    title={editingStatusId ? "Editar estado" : "Nuevo estado"}
                    description="Crea o actualiza estados reutilizables para las entidades del sistema."
                    size="lg"
                    footer={
                        <div className="flex w-full justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={cancelStatusEditing}
                                disabled={isSubmittingStatus || entityTypes.length === 0}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void onSubmitStatus()}
                                disabled={isSubmittingStatus || entityTypes.length === 0}
                                isLoading={isSubmittingStatus}
                            >
                                {editingStatusId ? "Actualizar estado" : "Crear estado"}
                            </Button>
                        </div>
                    }
                >
                    {entityTypes.length === 0 ? (
                        <Alert variant="warning" className="mb-4 rounded-lg">
                            Primero debes crear al menos un tipo de entidad para registrar estados.
                        </Alert>
                    ) : null}
                    <form onSubmit={onSubmitStatus} className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Código"
                            placeholder="Ej: ACTIVE"
                            error={errors.code?.message}
                            {...register("code")}
                            disabled={entityTypes.length === 0}
                        />
                        <Select
                            label="Entidad"
                            options={entityTypes.map((entity) => ({
                                value: String(entity.id),
                                label: `${entity.name}${entity.description ? ` · ${entity.description}` : ""}`,
                            }))}
                            error={errors.entityTypeId?.message}
                            {...register("entityTypeId")}
                            disabled={entityTypes.length === 0}
                        />
                        <Input
                            label="Descripción"
                            placeholder="Ej: Estado activo"
                            error={errors.description?.message}
                            {...register("description")}
                            disabled={entityTypes.length === 0}
                        />
                        <Input
                            type="text"
                            label="Color"
                            placeholder="#22C55E"
                            error={errors.color?.message}
                            {...register("color")}
                            disabled={entityTypes.length === 0}
                        />
                        <Select
                            label="Operativo"
                            options={[
                                { value: "true", label: "Sí" },
                                { value: "false", label: "No" },
                            ]}
                            error={errors.isOperational?.message}
                            {...register("isOperational")}
                            disabled={entityTypes.length === 0}
                        />
                    </form>
                </Modal>

                <Modal
                    isOpen={pendingStatusDelete !== null}
                    onClose={() => setPendingStatusDelete(null)}
                    closeOnBackdrop={isDeletingStatusId === null}
                    title="Confirmar eliminación"
                    description={
                        pendingStatusDelete
                            ? `Se eliminará el estado ${pendingStatusDelete.code ?? pendingStatusDelete.name}. Esta acción no se puede deshacer.`
                            : ""
                    }
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPendingStatusDelete(null)}
                                disabled={isDeletingStatusId !== null}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => void confirmDeleteStatus()}
                                disabled={isDeletingStatusId !== null}
                                isLoading={isDeletingStatusId !== null}
                            >
                                Eliminar estado
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Verifica que ningún flujo crítico dependa de este código antes de confirmar.
                    </p>
                </Modal>

                <Modal
                    isOpen={pendingEntityTypeDelete !== null}
                    onClose={() => setPendingEntityTypeDelete(null)}
                    closeOnBackdrop={isDeletingEntityTypeId === null}
                    title="Confirmar eliminación"
                    description={
                        pendingEntityTypeDelete
                            ? `Se eliminará el tipo de entidad ${pendingEntityTypeDelete.name}. Esta acción no se puede deshacer.`
                            : ""
                    }
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPendingEntityTypeDelete(null)}
                                disabled={isDeletingEntityTypeId !== null}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => void confirmDeleteEntityType()}
                                disabled={isDeletingEntityTypeId !== null}
                                isLoading={isDeletingEntityTypeId !== null}
                            >
                                Eliminar tipo
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Solo puedes eliminar tipos sin estados asociados en el catálogo.
                    </p>
                </Modal>
            </div>
        </RoleGuard>
    );
}
