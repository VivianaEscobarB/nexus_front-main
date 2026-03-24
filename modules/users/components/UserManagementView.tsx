"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge, Button, Card, CardBody, Input, Modal, RoleBadge, Select } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { listClients } from "@/modules/clients";
import {
    createUser,
    deleteUser,
    listUsers,
    updateUser,
    updateUserStatus,
} from "@/modules/users/api/usersApi";
import type {
    CreateUserInput,
    ManagedUser,
    ManagedUserStatus,
    UpdateUserInput,
} from "@/modules/users/api/userTypes";
import type { ManagedClient } from "@/modules/clients";
import {
    listCitiesByRegion,
    listCountries,
    listRegionsByCountry,
    resolveCityHierarchy,
    type LocationCity,
    type LocationRegion,
} from "@/modules/locations";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

type UserManagementViewMode = "default" | "create";

interface UserManagementViewProps {
    initialMode?: UserManagementViewMode;
}

const ROLE_OPTIONS = [
    { value: UserRole.ADMIN, label: "Administrador" },
    { value: UserRole.WAREHOUSE_SUPERVISOR, label: "Supervisor de Bodega" },
    { value: UserRole.WAREHOUSE_OPERATOR, label: "Operador de Bodega" },
    { value: UserRole.SALES_AGENT, label: "Agente de Ventas" },
    { value: UserRole.CLIENT, label: "Cliente" },
] as const;

const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
    { value: "SUSPENDED", label: "Suspendido" },
] as const;

function getStatusVariant(status: ManagedUserStatus) {
    switch (status) {
        case "ACTIVE":
            return "success" as const;
        case "INACTIVE":
            return "neutral" as const;
        case "SUSPENDED":
            return "warning" as const;
        default:
            return "neutral" as const;
    }
}

function getStatusLabel(status: ManagedUserStatus): string {
    switch (status) {
        case "ACTIVE":
            return "Activo";
        case "INACTIVE":
            return "Inactivo";
        case "SUSPENDED":
            return "Suspendido";
        default:
            return status;
    }
}

/**
 * Esquema estable: el resolver de RHF no se actualiza si el objeto Zod cambia de referencia.
 * `getIsEditing` permite exigir cityId y password solo al crear.
 */
function buildUserFormSchema(getIsEditing: () => boolean) {
    return z
        .object({
            username: z
                .string()
                .min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
            email: z
                .string()
                .min(1, "El correo es obligatorio")
                .email("Debes ingresar un correo valido"),
            role: z.nativeEnum(UserRole, { message: "Selecciona un rol valido" }),
            status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"], {
                message: "Selecciona un estado valido",
            }),
            clientId: z.string().optional(),
            countryId: z.string().optional(),
            regionId: z.string().optional(),
            cityId: z.string().optional(),
            password: z.string().optional(),
        })
        .superRefine((values, ctx) => {
            const editing = getIsEditing();

            if (
                values.role === UserRole.CLIENT &&
                (!values.clientId || values.clientId.trim().length === 0)
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["clientId"],
                    message: "Debes asociar el usuario a un cliente existente.",
                });
            }

            if (!editing) {
                if (!values.cityId || values.cityId.trim().length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["cityId"],
                        message:
                            "Selecciona pais, region y ciudad. El API exige cityId numerico.",
                    });
                } else if (!Number.isFinite(Number(values.cityId))) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["cityId"],
                        message: "Ciudad invalida. Vuelve a seleccionar.",
                    });
                }
                if (!values.password || values.password.length < 8) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["password"],
                        message: "La contrasena debe tener al menos 8 caracteres",
                    });
                }
            } else if (
                values.password &&
                values.password.length > 0 &&
                values.password.length < 8
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["password"],
                    message: "La contrasena debe tener al menos 8 caracteres",
                });
            }

            if (editing) {
                const hasLocation =
                    (values.countryId && values.countryId.trim().length > 0) ||
                    (values.regionId && values.regionId.trim().length > 0) ||
                    (values.cityId && values.cityId.trim().length > 0);
                if (hasLocation && (!values.cityId || !Number.isFinite(Number(values.cityId)))) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["cityId"],
                        message: "Completa pais, region y ciudad o deja la ubicacion vacia.",
                    });
                }
            }
        });
}

type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>;

function buildDefaultValues(user?: ManagedUser): UserFormValues {
    return {
        username: user?.username ?? "",
        email: user?.email ?? "",
        role: (user?.roles[0] as UserRole) ?? UserRole.WAREHOUSE_OPERATOR,
        status: user?.status ?? "ACTIVE",
        clientId: user?.clientId ?? "",
        countryId: "",
        regionId: "",
        cityId: "",
        password: "",
    };
}

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin registro";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Sin registro";
    }

    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        return error.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible completar la operacion.";
}

function UsersTableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
                <div
                    key={index}
                    className="h-14 rounded-xl animate-pulse bg-[var(--color-surface-hover)]"
                />
            ))}
        </div>
    );
}

export function UserManagementView({
    initialMode = "default",
}: UserManagementViewProps) {
    const router = useRouter();
    const [users, setUsers] = React.useState<ManagedUser[]>([]);
    const [clients, setClients] = React.useState<ManagedClient[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(
        initialMode === "create"
    );
    const [editingUser, setEditingUser] = React.useState<ManagedUser | null>(
        null
    );
    const [searchTerm, setSearchTerm] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("ALL");
    const [roleFilter, setRoleFilter] = React.useState("ALL");
    const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(
        null
    );
    const [pageError, setPageError] = React.useState<string | null>(null);
    const [actionError, setActionError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const [countries, setCountries] = React.useState<
        { id: number; name: string }[]
    >([]);
    const [regions, setRegions] = React.useState<LocationRegion[]>([]);
    const [cities, setCities] = React.useState<LocationCity[]>([]);
    const [locationsError, setLocationsError] = React.useState<string | null>(
        null
    );

    const isEditing = Boolean(editingUser);
    const isEditingRef = React.useRef(isEditing);
    React.useLayoutEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    const userFormSchema = React.useMemo(
        () => buildUserFormSchema(() => isEditingRef.current),
        []
    );

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        mode: "onChange",
        defaultValues: buildDefaultValues(),
    });

    const selectedRole = watch("role");
    const selectedCountryId = watch("countryId");
    const selectedRegionId = watch("regionId");

    function resetLocationPickers() {
        setRegions([]);
        setCities([]);
        setValue("countryId", "");
        setValue("regionId", "");
        setValue("cityId", "");
    }

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await listCountries();
                if (!cancelled) {
                    setCountries(
                        [...list].sort((a, b) =>
                            a.name.localeCompare(b.name, "es")
                        )
                    );
                    setLocationsError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setLocationsError(getErrorMessage(error));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (!isModalOpen || !editingUser?.cityId) {
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const hierarchy = await resolveCityHierarchy(editingUser.cityId!);
                if (cancelled || !hierarchy) {
                    return;
                }

                const regionsData = await listRegionsByCountry(
                    hierarchy.countryId
                );
                if (cancelled) {
                    return;
                }
                setRegions(regionsData);

                const citiesData = await listCitiesByRegion(hierarchy.regionId);
                if (cancelled) {
                    return;
                }
                setCities(citiesData);

                setValue("countryId", String(hierarchy.countryId), {
                    shouldValidate: false,
                });
                setValue("regionId", String(hierarchy.regionId), {
                    shouldValidate: false,
                });
                setValue("cityId", String(hierarchy.cityId), {
                    shouldValidate: false,
                });
            } catch {
                if (!cancelled) {
                    setLocationsError(
                        "No se pudo cargar la ciudad del usuario para edicion."
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [editingUser?.cityId, editingUser?.id, isModalOpen, setValue]);

    const loadUsers = React.useCallback(async () => {
        setIsLoading(true);
        setPageError(null);

        try {
            const [usersData, clientsData] = await Promise.all([
                listUsers(),
                listClients(),
            ]);
            setUsers(usersData);
            setClients(clientsData);
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    React.useEffect(() => {
        if (initialMode === "create") {
            setIsModalOpen(true);
            reset(buildDefaultValues());
        }
    }, [initialMode, reset]);

    React.useEffect(() => {
        if (selectedRole !== UserRole.CLIENT) {
            setValue("clientId", "");
        }
    }, [selectedRole, setValue]);

    const filteredUsers = React.useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                search.length === 0 ||
                user.username.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search);

            const matchesStatus =
                statusFilter === "ALL" || user.status === statusFilter;

            const matchesRole =
                roleFilter === "ALL" || user.roles.includes(roleFilter);

            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [roleFilter, searchTerm, statusFilter, users]);

    const totals = React.useMemo(() => {
        return {
            total: users.length,
            active: users.filter((user) => user.status === "ACTIVE").length,
            inactive: users.filter((user) => user.status !== "ACTIVE").length,
        };
    }, [users]);

    function closeModal() {
        setIsModalOpen(false);
        setEditingUser(null);
        setActionError(null);
        setIsPasswordVisible(false);
        setRegions([]);
        setCities([]);
        reset(buildDefaultValues());

        if (initialMode === "create") {
            router.replace("/dashboard/users");
        }
    }

    function openCreateModal() {
        setEditingUser(null);
        setActionError(null);
        setIsPasswordVisible(false);
        setRegions([]);
        setCities([]);
        reset(buildDefaultValues());
        setIsModalOpen(true);
    }

    function openEditModal(user: ManagedUser) {
        setEditingUser(user);
        setActionError(null);
        setIsPasswordVisible(false);
        setRegions([]);
        setCities([]);
        reset(buildDefaultValues(user));
        setIsModalOpen(true);
    }

    async function onSubmit(values: UserFormValues) {
        setIsSubmitting(true);
        setActionError(null);

        const rolesPayload = [values.role];
        const clientId =
            values.role === UserRole.CLIENT
                ? values.clientId?.trim() || null
                : null;

        try {
            if (editingUser) {
                const updatePayload: UpdateUserInput = {
                    username: values.username.trim(),
                    email: values.email.trim().toLowerCase(),
                    status: values.status,
                    roles: rolesPayload,
                    clientId,
                    password: values.password?.trim() || undefined,
                };

                const cityNum = Number(values.cityId);
                if (values.cityId && Number.isFinite(cityNum)) {
                    updatePayload.cityId = cityNum;
                }

                await updateUser(editingUser.id, updatePayload);
                setFeedbackMessage(
                    `Usuario ${values.username} actualizado correctamente.`
                );
            } else {
                const cityNum = Number(values.cityId);
                const createPayload: CreateUserInput = {
                    username: values.username.trim(),
                    email: values.email.trim().toLowerCase(),
                    password: values.password!.trim(),
                    status: values.status,
                    roles: rolesPayload,
                    cityId: cityNum,
                    clientId,
                };

                await createUser(createPayload);
                setFeedbackMessage(
                    `Usuario ${values.username} creado correctamente.`
                );
            }

            closeModal();
            await loadUsers();
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleStatusChange(user: ManagedUser) {
        const targetStatus: ManagedUserStatus =
            user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const confirmationMessage =
            targetStatus === "INACTIVE"
                ? `Vas a desactivar a ${user.username}.`
                : `Vas a reactivar a ${user.username}.`;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        setFeedbackMessage(null);
        setPageError(null);

        try {
            await updateUserStatus(user.id, targetStatus);
            setFeedbackMessage(
                targetStatus === "INACTIVE"
                    ? `Usuario ${user.username} desactivado.`
                    : `Usuario ${user.username} reactivado.`
            );
            await loadUsers();
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }

    async function handleDelete(user: ManagedUser) {
        if (
            !window.confirm(
                `Esta accion eliminara definitivamente a ${user.username}.`
            )
        ) {
            return;
        }

        setFeedbackMessage(null);
        setPageError(null);

        try {
            await deleteUser(user.id);
            setFeedbackMessage(`Usuario ${user.username} eliminado.`);
            await loadUsers();
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }

    return (
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Gestion de usuarios
                        </h1>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            Administra altas, cambios de rol, activacion y bajas del equipo interno.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => loadUsers()}>
                            Actualizar
                        </Button>
                        <Button variant="primary" onClick={openCreateModal}>
                            Nuevo usuario
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard title="Usuarios registrados" value={totals.total} />
                    <StatCard title="Activos" value={totals.active} tone="success" />
                    <StatCard title="Inactivos" value={totals.inactive} tone="warning" />
                </div>

                {feedbackMessage ? (
                    <div className="rounded-xl border border-[var(--color-success-default)] bg-[var(--color-success-subtle)] px-4 py-3 text-sm text-[var(--color-success-strong)]">
                        {feedbackMessage}
                    </div>
                ) : null}

                {pageError ? (
                    <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]">
                        {pageError}
                    </div>
                ) : null}

                <Card padding="lg">
                    <CardBody padding="none" className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 border-b border-[var(--color-border-subtle)] pb-5 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                            <Input
                                label="Buscar usuario"
                                placeholder="Nombre o correo"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                            <Select
                                label="Estado"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                options={[
                                    { value: "ALL", label: "Todos los estados" },
                                    ...STATUS_OPTIONS,
                                ]}
                            />
                            <Select
                                label="Rol"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value)}
                                options={[
                                    { value: "ALL", label: "Todos los roles" },
                                    ...ROLE_OPTIONS,
                                ]}
                            />
                        </div>

                        {isLoading ? (
                            <UsersTableSkeleton />
                        ) : filteredUsers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[var(--color-border-default)] px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                                No hay usuarios que coincidan con los filtros actuales.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border-subtle)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                            <th className="px-4 py-3 font-semibold">
                                                Usuario
                                            </th>
                                            <th className="px-4 py-3 font-semibold">
                                                Rol
                                            </th>
                                            <th className="px-4 py-3 font-semibold">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 font-semibold">
                                                Creado
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-[var(--color-border-subtle)] last:border-0"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-[var(--color-text-primary)]">
                                                        {user.username}
                                                    </div>
                                                    <div className="text-xs text-[var(--color-text-secondary)]">
                                                        {user.email}
                                                    </div>
                                                    {user.clientName ? (
                                                        <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                                                            Cliente asociado: {user.clientName}
                                                        </div>
                                                    ) : null}
                                                    <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                                                        Ultimo acceso: {formatDate(user.lastLoginAt)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {user.roles.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {user.roles.map((role) => (
                                                                Object.values(UserRole).includes(
                                                                    role as UserRole
                                                                ) ? (
                                                                    <RoleBadge
                                                                        key={role}
                                                                        role={role as UserRole}
                                                                    />
                                                                ) : (
                                                                    <Badge
                                                                        key={role}
                                                                        label={role}
                                                                        variant="neutral"
                                                                    />
                                                                )
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <Badge
                                                            label="Sin rol"
                                                            variant="neutral"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        label={getStatusLabel(user.status)}
                                                        variant={getStatusVariant(user.status)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                                                    {formatDate(user.createdAt)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditModal(user)}
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleStatusChange(user)}
                                                        >
                                                            {user.status === "ACTIVE"
                                                                ? "Desactivar"
                                                                : "Reactivar"}
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(user)}
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

                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={isEditing ? "Editar usuario" : "Crear usuario"}
                    description={
                        isEditing
                            ? "Actualiza los datos y permisos del usuario."
                            : "Registra un nuevo usuario del sistema."
                    }
                    size="lg"
                >
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        {actionError ? (
                            <div className="rounded-xl border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] px-4 py-3 text-sm text-[var(--color-danger-strong)]">
                                {actionError}
                            </div>
                        ) : null}

                        {locationsError ? (
                            <div className="rounded-xl border border-[var(--color-warning-default)] bg-[var(--color-warning-subtle)] px-4 py-3 text-sm text-[var(--color-warning-strong)]">
                                {locationsError}
                                <button
                                    type="button"
                                    className="ml-2 underline"
                                    onClick={() => {
                                        setLocationsError(null);
                                        resetLocationPickers();
                                    }}
                                >
                                    Limpiar ubicacion
                                </button>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Nombre de usuario"
                                placeholder="Ej. Juan Perez"
                                error={errors.username?.message}
                                {...register("username")}
                            />
                            <Input
                                label="Correo"
                                type="email"
                                placeholder="usuario@empresa.com"
                                error={errors.email?.message}
                                {...register("email")}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Select
                                label="Pais"
                                options={countries.map((c) => ({
                                    value: String(c.id),
                                    label: c.name,
                                }))}
                                disabled={countries.length === 0}
                                hint="Catálogo /api/locations/countries"
                                {...register("countryId", {
                                    onChange: async (e) => {
                                        const v = e.target.value;
                                        setValue("regionId", "");
                                        setValue("cityId", "");
                                        setCities([]);
                                        if (!v) {
                                            setRegions([]);
                                            return;
                                        }
                                        try {
                                            const r = await listRegionsByCountry(
                                                Number(v)
                                            );
                                            setRegions(r);
                                            setLocationsError(null);
                                        } catch (error) {
                                            setRegions([]);
                                            setLocationsError(getErrorMessage(error));
                                        }
                                    },
                                })}
                            />
                            <Select
                                label="Region"
                                options={regions.map((r) => ({
                                    value: String(r.id),
                                    label: r.name,
                                }))}
                                disabled={!selectedCountryId}
                                hint="Regiones del pais seleccionado"
                                {...register("regionId", {
                                    onChange: async (e) => {
                                        const v = e.target.value;
                                        setValue("cityId", "");
                                        if (!v) {
                                            setCities([]);
                                            return;
                                        }
                                        try {
                                            const list = await listCitiesByRegion(
                                                Number(v)
                                            );
                                            setCities(list);
                                            setLocationsError(null);
                                        } catch (error) {
                                            setCities([]);
                                            setLocationsError(getErrorMessage(error));
                                        }
                                    },
                                })}
                            />
                            <Select
                                label="Ciudad"
                                options={cities.map((city) => ({
                                    value: String(city.id),
                                    label: city.name,
                                }))}
                                disabled={!selectedRegionId}
                                error={errors.cityId?.message}
                                hint={
                                    isEditing
                                        ? "Opcional: solo se envia cityId si eliges una ciudad."
                                        : "Obligatorio: se envia cityId numerico en el POST."
                                }
                                {...register("cityId")}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Select
                                label="Rol"
                                options={ROLE_OPTIONS.map((role) => ({
                                    value: role.value,
                                    label: role.label,
                                }))}
                                error={errors.role?.message}
                                hint='El API espera roles como arreglo; aqui se envia un rol, p. ej. ["SALES_AGENT"].'
                                {...register("role")}
                            />
                            <Select
                                label="Estado"
                                options={STATUS_OPTIONS.map((status) => ({
                                    value: status.value,
                                    label: status.label,
                                }))}
                                error={errors.status?.message}
                                {...register("status")}
                            />
                        </div>

                        {selectedRole === UserRole.CLIENT ? (
                            <Select
                                label="Cliente asociado"
                                options={[
                                    { value: "", label: "Selecciona un cliente..." },
                                    ...clients.map((client) => ({
                                        value: client.id,
                                        label: `${client.businessName} (${client.email})`,
                                    })),
                                ]}
                                error={errors.clientId?.message}
                                hint="La cuenta CLIENT quedara vinculada al registro comercial existente."
                                {...register("clientId")}
                            />
                        ) : null}

                        <div className="relative">
                            <Input
                                label={
                                    isEditing
                                        ? "Nueva contrasena (opcional)"
                                        : "Contrasena inicial"
                                }
                                type={isPasswordVisible ? "text" : "password"}
                                placeholder="Minimo 8 caracteres"
                                error={errors.password?.message}
                                trailingIcon={<span className="h-5 w-5" />}
                                {...register("password")}
                            />
                            <button
                                type="button"
                                aria-label={
                                    isPasswordVisible
                                        ? "Ocultar contraseña"
                                        : "Mostrar contraseña"
                                }
                                onClick={() =>
                                    setIsPasswordVisible((visible) => !visible)
                                }
                                className="absolute right-3 top-[2.35rem] flex h-5 w-5 items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                            >
                                {isPasswordVisible ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                                        <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7a11.83 11.83 0 0 1-4.09 5.19" />
                                        <path d="M6.61 6.61A11.84 11.84 0 0 0 1 12c.77 1.73 2 3.34 3.57 4.61" />
                                    </svg>
                                ) : (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    >
                                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                {isEditing ? "Guardar cambios" : "Crear usuario"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </RoleGuard>
    );
}

function StatCard({
    title,
    value,
    tone = "neutral",
}: {
    title: string;
    value: number;
    tone?: "neutral" | "success" | "warning";
}) {
    const toneClass =
        tone === "success"
            ? "bg-[var(--color-success-subtle)] text-[var(--color-success-strong)]"
            : tone === "warning"
                ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning-strong)]"
                : "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]";

    return (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-5">
            <div className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${toneClass}`}>
                {title}
            </div>
            <div className="mt-4 text-3xl font-bold text-[var(--color-text-primary)]">
                {value}
            </div>
        </div>
    );
}
