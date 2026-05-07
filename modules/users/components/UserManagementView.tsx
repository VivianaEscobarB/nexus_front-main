"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Badge, Button, Card, CardBody, Input, Modal, RoleBadge, Select } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import {
    activateUser,
    createUser,
    deactivateUser,
    listUsers,
    updateUser,
} from "@/modules/users/api/usersApi";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { listRoles, type ApiRole } from "@/modules/users/api/rolesApi";
import type {
    CreateUserInput,
    ManagedUser,
    ManagedUserStatus,
    UpdateUserInput,
} from "@/modules/users/api/userTypes";
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
type PendingUserAction =
    | { type: "reactivate"; user: ManagedUser }
    | { type: "deactivate"; user: ManagedUser }
    | null;

interface UserManagementViewProps {
    initialMode?: UserManagementViewMode;
}

const CREATE_USER_SUCCESS_FLASH_KEY = "nexus.users.create-success";
const NON_EMPLOYEE_ROLE_NAMES = new Set<string>([UserRole.CLIENT]);
const ROLE_LABELS: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.WAREHOUSE_SUPERVISOR]: "Supervisor de Bodega",
    [UserRole.WAREHOUSE_OPERATOR]: "Operador de Bodega",
    [UserRole.SALES_AGENT]: "Agente de Ventas",
    [UserRole.CLIENT]: "Cliente",
};

const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
    { value: "SUSPENDED", label: "Suspendido" },
] as const;

function getRoleLabel(roleName: string): string {
    return ROLE_LABELS[roleName] ?? roleName;
}

function mapRoleToSelectOption(role: ApiRole) {
    return {
        value: role.name,
        label: getRoleLabel(role.name),
    };
}

function persistCreateSuccessMessage(message: string): void {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.setItem(CREATE_USER_SUCCESS_FLASH_KEY, message);
}

function consumeCreateSuccessMessage(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    const message = window.sessionStorage.getItem(CREATE_USER_SUCCESS_FLASH_KEY);

    if (!message) {
        return null;
    }

    window.sessionStorage.removeItem(CREATE_USER_SUCCESS_FLASH_KEY);
    return message;
}

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

/** Activos y demás estados primero; INACTIVE al final. Mismo criterio secundario que el listado API (nombre). */
function compareUsersByActiveThenName(a: ManagedUser, b: ManagedUser): number {
    const aInactive = a.status === "INACTIVE" ? 1 : 0;
    const bInactive = b.status === "INACTIVE" ? 1 : 0;
    if (aInactive !== bInactive) {
        return aInactive - bInactive;
    }
    return a.username.localeCompare(b.username, "es", { sensitivity: "base" });
}

function buildUserFormSchema(getAllowedRoles: () => readonly string[]) {
    return z
        .object({
            username: z
                .string()
                .trim()
                .min(1, "El nombre de usuario es obligatorio"),
            email: z
                .string()
                .min(1, "El correo es obligatorio")
                .email("Debes ingresar un correo valido"),
            roles: z
                .array(z.string())
                .min(1, "Selecciona al menos un rol"),
            status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"], {
                message: "Selecciona un estado valido",
            }),
            countryId: z.string().optional(),
            regionId: z.string().optional(),
            cityId: z
                .string()
                .trim()
                .min(
                    1,
                    "Selecciona país, región y ciudad."
                ),
        })
        .superRefine((values, ctx) => {
            if (!Number.isFinite(Number(values.cityId))) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["cityId"],
                    message: "Ciudad inválida. Vuelve a seleccionar.",
                });
            }

            const allowedRoles = getAllowedRoles();
            if (allowedRoles.length > 0) {
                const invalidRole = values.roles.find(
                    (roleName) => !allowedRoles.includes(roleName)
                );
                if (invalidRole) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["roles"],
                        message:
                            "Uno o más roles no están permitidos para empleados.",
                    });
                }
            }
        });
}

type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>;

type PendingRestrictedStatusSubmit =
    | { flow: "edit_downgrade"; values: UserFormValues }
    | { flow: "create_restricted"; values: UserFormValues };

function buildDefaultValues(user?: ManagedUser): UserFormValues {
    const employeeRolesFromUser = (user?.roles ?? []).filter(
        (roleName) => !NON_EMPLOYEE_ROLE_NAMES.has(roleName)
    );
    const roles =
        employeeRolesFromUser.length > 0
            ? employeeRolesFromUser
            : [UserRole.WAREHOUSE_OPERATOR];

    return {
        username: user?.username ?? "",
        email: user?.email ?? "",
        roles,
        status: user?.status ?? "ACTIVE",
        countryId: "",
        regionId: "",
        cityId: "",
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

    return "No fue posible completar la operación.";
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
    const [availableRoles, setAvailableRoles] = React.useState<ApiRole[]>([]);
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
    const submitLockRef = React.useRef(false);
    const [countries, setCountries] = React.useState<
        { id: number; name: string }[]
    >([]);
    const [regions, setRegions] = React.useState<LocationRegion[]>([]);
    const [cities, setCities] = React.useState<LocationCity[]>([]);
    const [locationsError, setLocationsError] = React.useState<string | null>(
        null
    );
    const [pendingAction, setPendingAction] = React.useState<PendingUserAction>(
        null
    );
    const [pendingRestrictedStatusSubmit, setPendingRestrictedStatusSubmit] =
        React.useState<PendingRestrictedStatusSubmit | null>(null);

    const isEditing = Boolean(editingUser);
    const allowedEmployeeRoleNames = React.useMemo(() => {
        const fromApi = availableRoles
            .map((role) => role.name)
            .filter((roleName) => !NON_EMPLOYEE_ROLE_NAMES.has(roleName));
        const fromEditedUser = (editingUser?.roles ?? []).filter(
            (roleName) => !NON_EMPLOYEE_ROLE_NAMES.has(roleName)
        );
        return [...new Set([...fromApi, ...fromEditedUser])];
    }, [availableRoles, editingUser]);
    const allowedEmployeeRoleNamesRef = React.useRef<readonly string[]>(
        allowedEmployeeRoleNames
    );
    React.useLayoutEffect(() => {
        allowedEmployeeRoleNamesRef.current = allowedEmployeeRoleNames;
    }, [allowedEmployeeRoleNames]);

    const roleFilterOptions = React.useMemo(() => {
        const seen = new Set<string>();
        const sourceRoles =
            availableRoles.length > 0
                ? availableRoles.map((role) => role.name)
                : users.flatMap((user) => user.roles);

        return sourceRoles
            .filter((roleName) => {
                if (!roleName || seen.has(roleName)) {
                    return false;
                }

                seen.add(roleName);
                return true;
            })
            .sort((a, b) => getRoleLabel(a).localeCompare(getRoleLabel(b), "es"))
            .map((roleName) => ({
                value: roleName,
                label: getRoleLabel(roleName),
            }));
    }, [availableRoles, users]);

    const employeeRoleOptions = React.useMemo(
        () =>
            availableRoles
                .filter((role) => !NON_EMPLOYEE_ROLE_NAMES.has(role.name))
                .sort((a, b) =>
                    getRoleLabel(a.name).localeCompare(getRoleLabel(b.name), "es")
                )
                .map(mapRoleToSelectOption),
        [availableRoles]
    );

    const hasCreatedByColumn = React.useMemo(
        () => users.some((user) => Boolean(user.createdByName)),
        [users]
    );

    const userFormSchema = React.useMemo(
        () => buildUserFormSchema(() => allowedEmployeeRoleNamesRef.current),
        []
    );

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        mode: "onChange",
        defaultValues: buildDefaultValues(),
    });

    const selectedCountryId = watch("countryId");
    const selectedRegionId = watch("regionId");
    const selectedRoles = watch("roles") ?? [];

    /** Incluye roles ya asignados al usuario que aún no aparecen en el catálogo cargado (evita perderlos al guardar). */
    const formRoleCheckboxOptions = React.useMemo(() => {
        const catalogValues = new Set(
            employeeRoleOptions.map((option) => option.value)
        );
        const orphanRoles: { value: string; label: string }[] = [];
        const seenOrphan = new Set<string>();
        for (const roleName of selectedRoles) {
            if (
                catalogValues.has(roleName) ||
                NON_EMPLOYEE_ROLE_NAMES.has(roleName) ||
                seenOrphan.has(roleName)
            ) {
                continue;
            }
            seenOrphan.add(roleName);
            orphanRoles.push({
                value: roleName,
                label: `${getRoleLabel(roleName)} · asignado (no está en el catálogo cargado)`,
            });
        }
        return [...employeeRoleOptions, ...orphanRoles];
    }, [employeeRoleOptions, selectedRoles]);

    function resetLocationPickers() {
        setRegions([]);
        setCities([]);
        setValue("countryId", "");
        setValue("regionId", "");
        setValue("cityId", "");
    }

    React.useEffect(() => {
        const flashMessage = consumeCreateSuccessMessage();

        if (flashMessage) {
            setFeedbackMessage(flashMessage);
        }
    }, []);

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
                    shouldValidate: true,
                });
            } catch {
                if (!cancelled) {
                    setLocationsError(
                        "No se pudo cargar la ciudad del usuario para edición."
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
            const [usersData, rolesData] = await Promise.all([
                listUsers(),
                listRoles(),
            ]);
            setUsers(usersData);
            setAvailableRoles(rolesData);
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

    const filteredUsers = React.useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        const filtered = users.filter((user) => {
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

        return [...filtered].sort(compareUsersByActiveThenName);
    }, [roleFilter, searchTerm, statusFilter, users]);

    const {
        paginatedData: paginatedUsers,
        currentPage,
        totalPages,
        goToPage,
    } = usePagination(filteredUsers, 5);

    const totals = React.useMemo(() => {
        return {
            total: users.length,
            active: users.filter((user) => user.status === "ACTIVE").length,
            inactive: users.filter((user) => user.status !== "ACTIVE").length,
        };
    }, [users]);

    function resetModalState() {
        setEditingUser(null);
        setActionError(null);
        setLocationsError(null);
        submitLockRef.current = false;
        setIsSubmitting(false);
        setRegions([]);
        setCities([]);
        reset(buildDefaultValues());
    }

    function closeModal() {
        setIsModalOpen(false);
        resetModalState();

        if (initialMode === "create") {
            router.replace("/dashboard/users");
        }
    }

    function openCreateModal() {
        resetModalState();
        setIsModalOpen(true);
    }

    function openEditModal(user: ManagedUser) {
        setEditingUser(user);
        setActionError(null);
        setLocationsError(null);
        setRegions([]);
        setCities([]);
        reset(buildDefaultValues(user));
        setIsModalOpen(true);
    }

    async function executeUserSubmit(values: UserFormValues) {
        if (submitLockRef.current) {
            return;
        }

        submitLockRef.current = true;
        setIsSubmitting(true);
        setActionError(null);

        const rolesPayload = [
            ...new Set(
                values.roles.filter(
                    (roleName) => !NON_EMPLOYEE_ROLE_NAMES.has(roleName)
                )
            ),
        ];
        const cityId = Number(values.cityId);

        try {
            if (editingUser) {
                const updatePayload: UpdateUserInput = {
                    username: values.username.trim(),
                    email: values.email.trim().toLowerCase(),
                    status: values.status,
                    roles:
                        rolesPayload.length > 0
                            ? rolesPayload
                            : [UserRole.WAREHOUSE_OPERATOR],
                    cityId,
                };

                await updateUser(editingUser.id, updatePayload);
                setFeedbackMessage(
                    `Usuario ${values.username} actualizado correctamente.`
                );
                setIsModalOpen(false);
                resetModalState();
                await loadUsers();
            } else {
                const createPayload: CreateUserInput = {
                    username: values.username.trim(),
                    email: values.email.trim().toLowerCase(),
                    status: values.status,
                    roles:
                        rolesPayload.length > 0
                            ? rolesPayload
                            : [UserRole.WAREHOUSE_OPERATOR],
                    cityId,
                };

                await createUser(createPayload);
                const successMessage =
                    "Usuario creado correctamente. El empleado debe activar su cuenta desde el correo.";

                if (initialMode === "create") {
                    persistCreateSuccessMessage(successMessage);
                    setIsModalOpen(false);
                    resetModalState();
                    router.replace("/dashboard/users");
                    return;
                }

                setFeedbackMessage(successMessage);
                setIsModalOpen(false);
                resetModalState();
                await loadUsers();
                router.replace("/dashboard/users");
            }
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    }

    async function onSubmit(values: UserFormValues) {
        if (
            editingUser &&
            editingUser.status === "ACTIVE" &&
            values.status !== "ACTIVE"
        ) {
            setPendingRestrictedStatusSubmit({
                flow: "edit_downgrade",
                values,
            });
            return;
        }

        if (
            !editingUser &&
            (values.status === "INACTIVE" || values.status === "SUSPENDED")
        ) {
            setPendingRestrictedStatusSubmit({
                flow: "create_restricted",
                values,
            });
            return;
        }

        await executeUserSubmit(values);
    }

    async function confirmPendingRestrictedStatusSubmit() {
        if (!pendingRestrictedStatusSubmit) {
            return;
        }

        const { values } = pendingRestrictedStatusSubmit;
        setPendingRestrictedStatusSubmit(null);
        await executeUserSubmit(values);
    }

    async function handleReactivate(user: ManagedUser) {
        setFeedbackMessage(null);
        setPageError(null);

        try {
            await activateUser(user.id);
            setFeedbackMessage(`Usuario ${user.username} reactivado.`);
            await loadUsers();
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }

    async function handleDeactivate(user: ManagedUser) {
        setFeedbackMessage(null);
        setPageError(null);

        try {
            await deactivateUser(user.id);
            setFeedbackMessage(`Usuario ${user.username} desactivado.`);
            await loadUsers();
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }

    async function runPendingUserAction() {
        if (!pendingAction) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (pendingAction.type === "reactivate") {
                await handleReactivate(pendingAction.user);
            } else {
                await handleDeactivate(pendingAction.user);
            }
        } finally {
            setIsSubmitting(false);
            setPendingAction(null);
        }
    }

    return (
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
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
                    <Alert variant="success" className="rounded-xl">
                        {feedbackMessage}
                    </Alert>
                ) : null}

                {pageError ? (
                    <Alert variant="danger" className="rounded-xl">
                        {pageError}
                    </Alert>
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
                                    ...roleFilterOptions,
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
                                            {hasCreatedByColumn ? (
                                                <th className="px-4 py-3 font-semibold">
                                                    Creado por
                                                </th>
                                            ) : null}
                                            <th className="px-4 py-3 font-semibold">
                                                Fecha de creación
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUsers.map((user) => (
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
                                                        Último acceso: {formatDate(user.lastLoginAt)}
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
                                                {hasCreatedByColumn ? (
                                                    <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                                                        {user.createdByName || "Sin registro"}
                                                    </td>
                                                ) : null}
                                                <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                                                    {formatDate(user.createdAt)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            disabled={
                                                                user.status === "INACTIVE" ||
                                                                user.roles.includes(
                                                                    UserRole.CLIENT
                                                                )
                                                            }
                                                            title={
                                                                user.roles.includes(
                                                                    UserRole.CLIENT
                                                                )
                                                                    ? "Las cuentas de clientes se administran desde el módulo de clientes."
                                                                    : undefined
                                                            }
                                                            onClick={() => openEditModal(user)}
                                                        >
                                                            Editar
                                                        </Button>
                                                        {user.status !== "ACTIVE" ? (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setPendingAction({
                                                                        type: "reactivate",
                                                                        user,
                                                                    })
                                                                }
                                                            >
                                                                Reactivar
                                                            </Button>
                                                        ) : null}
                                                        {user.status !== "INACTIVE" ? (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setPendingAction({
                                                                        type: "deactivate",
                                                                        user,
                                                                    })
                                                                }
                                                            >
                                                                Desactivar
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                        />
                    </CardBody>
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={isEditing ? "Editar usuario" : "Crear usuario"}
                    description={
                        isEditing
                            ? "Actualiza los datos y permisos del usuario."
                            : "Registra un nuevo usuario. El acceso se enviará por correo."
                    }
                    size="lg"
                >
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                        aria-busy={isSubmitting}
                    >
                        {actionError ? (
                            <Alert variant="danger" className="rounded-xl">
                                {actionError}
                            </Alert>
                        ) : null}

                        {locationsError ? (
                            <Alert variant="warning" className="rounded-xl">
                                {locationsError}
                                <button
                                    type="button"
                                    className="ml-2 underline"
                                    onClick={() => {
                                        setLocationsError(null);
                                        resetLocationPickers();
                                    }}
                                >
                                    Limpiar ubicación
                                </button>
                            </Alert>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Nombre de usuario"
                                placeholder="Ej. Juan Pérez"
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
                                label="País"
                                options={countries.map((c) => ({
                                    value: String(c.id),
                                    label: c.name,
                                }))}
                                disabled={countries.length === 0}
                                hint="Selecciona el país del usuario."
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
                                label="Región"
                                options={regions.map((r) => ({
                                    value: String(r.id),
                                    label: r.name,
                                }))}
                                disabled={!selectedCountryId}
                                hint="Selecciona la región correspondiente."
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
                                hint="Selecciona la ciudad del usuario."
                                {...register("cityId")}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <fieldset className="min-w-0 space-y-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-4">
                                <legend className="text-sm font-medium text-[var(--color-text-primary)] px-1">
                                    Roles
                                </legend>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    Marca todos los roles que aplican; los permisos se combinan según cada rol.
                                </p>
                                <div className="mt-2 space-y-2.5">
                                    {formRoleCheckboxOptions.length === 0 ? (
                                        <p className="text-xs text-[var(--color-text-tertiary)]">
                                            Cargando roles disponibles…
                                        </p>
                                    ) : (
                                        formRoleCheckboxOptions.map((option) => {
                                            const checked = selectedRoles.includes(
                                                option.value
                                            );
                                            return (
                                                <label
                                                    key={option.value}
                                                    className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-text-primary)]"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-border-default)] text-[var(--color-brand-strong)] focus:ring-[var(--color-brand-strong)]"
                                                        checked={checked}
                                                        onChange={(event) => {
                                                            const nextChecked =
                                                                event.target
                                                                    .checked;
                                                            const base =
                                                                selectedRoles.filter(
                                                                    (r) =>
                                                                        r !==
                                                                        option.value
                                                                );
                                                            const next = nextChecked
                                                                ? [
                                                                      ...base,
                                                                      option.value,
                                                                  ]
                                                                : base;
                                                            setValue(
                                                                "roles",
                                                                next,
                                                                {
                                                                    shouldValidate: true,
                                                                }
                                                            );
                                                        }}
                                                    />
                                                    <span>{option.label}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                                {errors.roles?.message ? (
                                    <p className="text-xs text-[var(--color-danger-strong)]">
                                        {errors.roles.message}
                                    </p>
                                ) : null}
                            </fieldset>
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

                        {/*
                            
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

                        */}
                        <div className="flex justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmitting}
                                disabled={isSubmitting || !isValid}
                            >
                                {isSubmitting
                                    ? isEditing
                                        ? "Guardando cambios..."
                                        : "Creando usuario..."
                                    : isEditing
                                        ? "Guardar cambios"
                                        : "Crear usuario"}
                            </Button>
                        </div>
                    </form>
                </Modal>
                <Modal
                    isOpen={pendingAction !== null}
                    onClose={() => {
                        if (!isSubmitting) {
                            setPendingAction(null);
                        }
                    }}
                    closeOnBackdrop={!isSubmitting}
                    title={
                        pendingAction?.type === "reactivate"
                            ? "Confirmar reactivación"
                            : "Confirmar desactivación"
                    }
                    description={
                        pendingAction
                            ? pendingAction.type === "reactivate"
                                ? `Vas a reactivar a ${pendingAction.user.username}.`
                                : `Se desactivará la cuenta de ${pendingAction.user.username}: no podrá iniciar sesión. Podrás reactivarla desde esta lista cuando lo necesites.`
                            : ""
                    }
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPendingAction(null)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant={
                                    pendingAction?.type === "reactivate"
                                        ? "secondary"
                                        : "primary"
                                }
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                onClick={() => void runPendingUserAction()}
                            >
                                {pendingAction?.type === "reactivate"
                                    ? "Reactivar usuario"
                                    : "Desactivar usuario"}
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {pendingAction?.type === "reactivate"
                            ? "El usuario recuperará acceso a la plataforma. Confirma solo si es la acción que necesitas."
                            : "La cuenta quedará inactiva y podrá reactivarse más adelante. Confirma solo si estás seguro de inhabilitar el acceso."}
                    </p>
                </Modal>

                <Modal
                    isOpen={pendingRestrictedStatusSubmit !== null}
                    onClose={() => {
                        if (!isSubmitting) {
                            setPendingRestrictedStatusSubmit(null);
                        }
                    }}
                    closeOnBackdrop={!isSubmitting}
                    title={
                        pendingRestrictedStatusSubmit?.flow === "create_restricted"
                            ? "Confirmar alta con estado restringido"
                            : "Confirmar cambio de estado"
                    }
                    description={
                        pendingRestrictedStatusSubmit
                            ? pendingRestrictedStatusSubmit.flow === "create_restricted"
                                ? pendingRestrictedStatusSubmit.values.status === "INACTIVE"
                                    ? `Se creará la cuenta de ${pendingRestrictedStatusSubmit.values.username} ya como inactiva: no podrá iniciar sesión hasta que la reactives.`
                                    : `Se creará la cuenta de ${pendingRestrictedStatusSubmit.values.username} ya suspendida según las reglas del sistema.`
                                : pendingRestrictedStatusSubmit.values.status === "INACTIVE"
                                    ? `El usuario ${pendingRestrictedStatusSubmit.values.username} quedará inactivo y no podrá iniciar sesión hasta que lo reactives.`
                                    : `El usuario ${pendingRestrictedStatusSubmit.values.username} quedará suspendido según las reglas definidas en el sistema.`
                            : ""
                    }
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPendingRestrictedStatusSubmit(null)}
                                disabled={isSubmitting}
                            >
                                Volver y revisar
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                onClick={() =>
                                    void confirmPendingRestrictedStatusSubmit()
                                }
                            >
                                {pendingRestrictedStatusSubmit?.flow ===
                                "create_restricted"
                                    ? "Confirmar alta"
                                    : "Confirmar cambio"}
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {pendingRestrictedStatusSubmit?.flow === "create_restricted"
                            ? "Registrar directamente en inactivo o suspendido suele reservarse a casos puntuales (previsión de ingreso, bloqueo previo al alta, etc.). Cancela si no es lo que buscas."
                            : "Estás pasando un usuario activo a un estado restringido desde el formulario de edición. Cancela si llegaste aquí por error o si aún no has validado el impacto en accesos y permisos."}
                    </p>
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
