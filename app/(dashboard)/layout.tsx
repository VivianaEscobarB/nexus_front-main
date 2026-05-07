"use client";

import React, { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/modules/auth";
import { getCurrentUser } from "@/modules/auth/api/authApi";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Brand } from "@/components/Brand";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { AccessibilityMenu } from "@/components/ui/AccessibilityMenu";
import { LegalFooter } from "@/components/ui/LegalFooter";
import { useAuthStore, authStore } from "@/modules/auth/state/authStore";
import { isBusinessProcessVisible } from "@/shared/config/processVisibility";
import { UserRole } from "@/types";
import { getPrimaryRoleName, userHasRole } from "@/shared/auth/primaryRole";

type IconProps = {
    className?: string;
    style?: CSSProperties;
};

type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<IconProps>;
};

type NavGroup = {
    title?: string;
    items: NavItem[];
};

function getRoleLabel(roleName: string): string {
    switch (roleName) {
        case UserRole.ADMIN:
            return "Administrador";
        case UserRole.WAREHOUSE_SUPERVISOR:
            return "Supervisor de bodega";
        case UserRole.WAREHOUSE_OPERATOR:
            return "Operador de bodega";
        case UserRole.SALES_AGENT:
            return "Agente comercial";
        case UserRole.CLIENT:
            return "Cliente";
        default:
            return roleName.replace(/_/g, " ");
    }
}

export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { user, signOut } = useAuth();
    const authState = useAuthStore();
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<{avatarUrl: string} | null>(null);

    const role = getPrimaryRoleName(user?.roles, UserRole.WAREHOUSE_OPERATOR);

    const getRouteMetadata = (path: string) => {
        if (path === "/dashboard") {
            return {
                title: "Inicio",
                description: "Resumen de operaciones y accesos rápidos."
            };
        }
        if (path.startsWith("/dashboard/users")) {
            return {
                title: "Gestión de usuarios",
                description: "Crea, actualiza y administra los accesos del equipo."
            };
        }
        if (path.startsWith("/dashboard/clients")) {
            return {
                title: "Directorio comercial",
                description: "Consulta los clientes registrados y crea nuevas fichas comerciales."
            };
        }
        if (path.startsWith("/dashboard/contracts")) {
            return {
                title: "Historial de contratos",
                description: "Gestiona y supervisa todos los acuerdos comerciales y su estado financiero."
            };
        }
        if (path.startsWith("/dashboard/infrastructure")) {
            const isSales = role === UserRole.SALES_AGENT;
            const isOperator = role === UserRole.WAREHOUSE_OPERATOR;

            return {
                title: isSales ? "Disponibilidad operativa" : "Estructura de bodegas",
                description: isSales
                    ? "Consulta la disponibilidad real de bodegas antes de ofertar."
                    : isOperator
                      ? "Consulta bodegas, sectores y espacios para ubicar tu trabajo en piso."
                      : "Gestiona la estructura física de la operación.",
            };
        }
        if (path.startsWith("/dashboard/status-management")) {
            return {
                title: "Gestión de estados",
                description:
                    "Administra estados reutilizables para bodegas, sectores y espacios."
            };
        }
        if (path.startsWith("/dashboard/sales/commercial-pricing")) {
            return {
                title: "Parametrización comercial",
                description:
                    "Define precio base, moneda y estado comercial de las unidades de arrendamiento.",
            };
        }
        if (path.startsWith("/dashboard/sales/rental-units")) {
            return {
                title: "Unidades de arrendamiento",
                description:
                    "Consulta del catálogo operativo: ubicación, disponibilidad y detalle por unidad.",
            };
        }

        if (path.startsWith("/dashboard/operador/recepcion-mercancia")) {
            return {
                title: "Recepción de mercancía",
                description:
                    "Registra vehículo, conductor, condiciones de transporte y documentación de la entrada.",
            };
        }

        if (path.startsWith("/dashboard/operador/recepcion-rf")) {
            return {
                title: "Entrada RF — recepción",
                description:
                    "Escanea códigos con la cámara o ingrésalos a mano y confirma la entrada al inventario.",
            };
        }

        if (path.startsWith("/dashboard/operador/conteo-inventario-rf")) {
            return {
                title: "Conteo RF — inventario",
                description:
                    "Conteo cíclico en piso: registra líneas (sistema vs físico) y cierra el conteo en el sistema.",
            };
        }

        if (path.startsWith("/dashboard/operador/movimientos-inventario")) {
            return {
                title: "Movimientos de inventario",
                description:
                    "Registra salidas, entradas o ajustes y revisa el impacto en el saldo por ubicación.",
            };
        }

        if (path.startsWith("/dashboard/supervisor/transferencias-bodegas")) {
            return {
                title: "Transferencias entre bodegas",
                description:
                    "Documenta traslados de producto entre sedes con fechas y cantidades.",
            };
        }

        if (path.startsWith("/dashboard/consulta-inventario")) {
            return {
                title: "Consulta de inventario",
                description:
                    role === UserRole.WAREHOUSE_OPERATOR
                        ? "Consulta existencias por producto y espacio de almacenamiento."
                        : "Filtra y revisa existencias por bodega, sector y estado operativo.",
            };
        }

        if (path.startsWith("/dashboard/historial-movimientos")) {
            return {
                title: "Historial de movimientos",
                description:
                    role === UserRole.WAREHOUSE_OPERATOR
                        ? "Consulta movimientos recientes del inventario o la tabla de ejemplo; el histórico consolidado ampliará esta vista."
                        : "Revisa entradas, salidas y ajustes registrados en el sistema.",
            };
        }

        if (path.startsWith("/dashboard/supervisor/alertas-sistema")) {
            return {
                title: "Alertas del sistema",
                description:
                    "Prioriza vencimientos, stock bajo y otras señales antes de tomar decisiones.",
            };
        }

        if (path.startsWith("/dashboard/my-inventory")) {
            return {
                title: "Mis bodegas",
                description: "Consulta bodegas y espacios disponibles para tu operación."
            };
        }
        
        if (path.startsWith("/dashboard/client/contracts")) {
            return {
                title: "Mis contratos y pagos",
                description: "Revisa tus contratos activos y pendientes de pago."
            };
        }

        return null;
    };

    const metadata = getRouteMetadata(pathname);

    React.useEffect(() => {
        getCurrentUser({ retryOnUnauthorized: false })
            .then((data) =>
                setUserProfile({
                    avatarUrl: data?.avatarUrl || data?.avatar_url || "",
                })
            )
            .catch(() => {
                setUserProfile(null);
            });
    }, []);

    React.useEffect(() => {
        setIsMobileNavOpen(false);
    }, [pathname]);

    const sessionDisplayName = [user?.first_name, user?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || "Usuario";
    const sessionEmail = user?.email || "usuario@nexus.com";
    const sessionRoleLabel = getRoleLabel(role);

    const navGroups: NavGroup[] = [
        { items: [{ name: "Inicio", href: "/dashboard", icon: HomeIcon }] },
    ];

    if (role === UserRole.ADMIN) {
        const infrastructureItems: NavItem[] = [];
        if (isBusinessProcessVisible("warehouseStructure")) {
            if (userHasRole(user?.roles, UserRole.WAREHOUSE_OPERATOR)) {
                infrastructureItems.push({
                    name: "Recepción de mercancía",
                    href: "/dashboard/operador/recepcion-mercancia",
                    icon: TruckReceiveIcon,
                });
                infrastructureItems.push({
                    name: "Entrada RF (cámara)",
                    href: "/dashboard/operador/recepcion-rf",
                    icon: CameraScannerIcon,
                });
                infrastructureItems.push({
                    name: "Movimientos de inventario",
                    href: "/dashboard/operador/movimientos-inventario",
                    icon: ArrowsRightLeftIcon,
                });
                infrastructureItems.push({
                    name: "Conteo RF (inventario)",
                    href: "/dashboard/operador/conteo-inventario-rf",
                    icon: ClipboardListIcon,
                });
            }
            if (userHasRole(user?.roles, UserRole.WAREHOUSE_SUPERVISOR)) {
                infrastructureItems.push({
                    name: "Alertas del sistema",
                    href: "/dashboard/supervisor/alertas-sistema",
                    icon: BellAlertIcon,
                });
                infrastructureItems.push({
                    name: "Transferencias entre bodegas",
                    href: "/dashboard/supervisor/transferencias-bodegas",
                    icon: BuildingOfficeIcon,
                });
            }
            if (
                userHasRole(user?.roles, UserRole.WAREHOUSE_OPERATOR) ||
                userHasRole(user?.roles, UserRole.WAREHOUSE_SUPERVISOR)
            ) {
                infrastructureItems.push({
                    name: "Consulta de inventario",
                    href: "/dashboard/consulta-inventario",
                    icon: MagnifyingGlassIcon,
                });
                infrastructureItems.push({
                    name: "Historial de movimientos",
                    href: "/dashboard/historial-movimientos",
                    icon: HistoryIcon,
                });
            }
            infrastructureItems.push({
                name: "Estructura de bodegas",
                href: "/dashboard/infrastructure",
                icon: BoxIcon,
            });
        }

        const salesItems: NavItem[] = [
            ...(isBusinessProcessVisible("contracts")
                ? [{
                    name: "Parametrización comercial",
                    href: "/dashboard/sales/commercial-pricing",
                    icon: TagIcon,
                }]
                : []),
        ];

        const userItems: NavItem[] = isBusinessProcessVisible("userManagement")
            ? [{
                name: "Gestión de usuarios",
                href: "/dashboard/users",
                icon: ClipboardIcon,
            }]
            : [];

        const settingsItems: NavItem[] = [{
            name: "Gestión de estados",
            href: "/dashboard/status-management",
            icon: SwatchIcon,
        }];

        if (infrastructureItems.length > 0) {
            navGroups.push({
                title: "INFRAESTRUCTURA DE BODEGAS",
                items: infrastructureItems,
            });
        }

        if (salesItems.length > 0) {
            navGroups.push({
                title: "GESTIÓN DE VENTAS",
                items: salesItems,
            });
        }

        if (userItems.length > 0) {
            navGroups.push({
                title: "USUARIOS",
                items: userItems,
            });
        }
        if (settingsItems.length > 0) {
            navGroups.push({
                title: "CONFIGURACIÓN GLOBAL",
                items: settingsItems,
            });
        }
    } else if (role === UserRole.WAREHOUSE_SUPERVISOR) {
        if (isBusinessProcessVisible("warehouseStructure")) {
            const operatorFloorItems: NavItem[] = userHasRole(
                user?.roles,
                UserRole.WAREHOUSE_OPERATOR
            )
                ? [
                      {
                          name: "Recepción de mercancía",
                          href: "/dashboard/operador/recepcion-mercancia",
                          icon: TruckReceiveIcon,
                      },
                      {
                          name: "Entrada RF (cámara)",
                          href: "/dashboard/operador/recepcion-rf",
                          icon: CameraScannerIcon,
                      },
                      {
                          name: "Movimientos de inventario",
                          href: "/dashboard/operador/movimientos-inventario",
                          icon: ArrowsRightLeftIcon,
                      },
                      {
                          name: "Conteo RF (inventario)",
                          href: "/dashboard/operador/conteo-inventario-rf",
                          icon: ClipboardListIcon,
                      },
                  ]
                : [];

            const supervisionItems: NavItem[] = [
                {
                    name: "Alertas del sistema",
                    href: "/dashboard/supervisor/alertas-sistema",
                    icon: BellAlertIcon,
                },
                {
                    name: "Consulta de inventario",
                    href: "/dashboard/consulta-inventario",
                    icon: MagnifyingGlassIcon,
                },
                {
                    name: "Historial de movimientos",
                    href: "/dashboard/historial-movimientos",
                    icon: HistoryIcon,
                },
                {
                    name: "Transferencias entre bodegas",
                    href: "/dashboard/supervisor/transferencias-bodegas",
                    icon: BuildingOfficeIcon,
                },
                {
                    name: "Estructura de bodegas",
                    href: "/dashboard/infrastructure",
                    icon: BoxIcon,
                },
            ];

            if (operatorFloorItems.length > 0) {
                navGroups.push({
                    title: "OPERACIÓN EN PISO",
                    items: operatorFloorItems,
                });
                navGroups.push({
                    title: "SUPERVISIÓN",
                    items: supervisionItems,
                });
            } else {
                navGroups.push({
                    title: "OPERACIONES",
                    items: supervisionItems,
                });
            }
        }
    } else if (role === UserRole.SALES_AGENT) {
        const salesItems: NavItem[] = [
            ...(isBusinessProcessVisible("warehouseStructure")
                ? [
                    {
                        name: "Catálogo de disponibilidad",
                        href: "/dashboard/sales/catalog",
                        icon: BoxIcon,
                    },
                    {
                        name: "Unidades de arrendamiento",
                        href: "/dashboard/sales/rental-units",
                        icon: CubeIcon,
                    },
                    {
                        name: "Disponibilidad Detallada",
                        href: "/dashboard/infrastructure",
                        icon: BoxIcon,
                    },
                ]
                : []),
            ...(isBusinessProcessVisible("contracts")
                ? [
                    {
                        name: "Parametrización comercial",
                        href: "/dashboard/sales/commercial-pricing",
                        icon: TagIcon,
                    },
                    {
                        name: "Gestión de Reservas",
                        href: "/dashboard/sales/reservations",
                        icon: ClipboardIcon,
                    },
                    {
                        name: "Consultar contratos",
                        href: "/dashboard/contracts",
                        icon: DocumentTextIcon,
                    }
                ]
                : []),
        ];

        if (salesItems.length > 0) {
            navGroups.push({
                title: "PROCESO COMERCIAL",
                items: salesItems,
            });
        }

        const salesManagementItems: NavItem[] = [
            ...(isBusinessProcessVisible("clientManagement")
                ? [{
                    name: "Directorio Comercial",
                    href: "/dashboard/clients",
                    icon: ClipboardIcon,
                }]
                : []),
            ...(isBusinessProcessVisible("contracts")
                ? [{
                    name: "Historial de contratos",
                    href: "/dashboard/contracts",
                    icon: CurrencyDollarIcon,
                }]
                : []),
        ];

        if (salesManagementItems.length > 0) {
            navGroups.push({
                title: "GESTIÓN Y CARTERA",
                items: salesManagementItems,
            });
        }
    } else if (role === UserRole.WAREHOUSE_OPERATOR) {
        if (isBusinessProcessVisible("warehouseStructure")) {
            const operatorEntradaItems: NavItem[] = [
                {
                    name: "Recepción de mercancía",
                    href: "/dashboard/operador/recepcion-mercancia",
                    icon: TruckReceiveIcon,
                },
                {
                    name: "Entrada RF (cámara)",
                    href: "/dashboard/operador/recepcion-rf",
                    icon: CameraScannerIcon,
                },
                {
                    name: "Movimientos de inventario",
                    href: "/dashboard/operador/movimientos-inventario",
                    icon: ArrowsRightLeftIcon,
                },
                {
                    name: "Conteo RF (inventario)",
                    href: "/dashboard/operador/conteo-inventario-rf",
                    icon: ClipboardListIcon,
                },
            ];
            const operatorConsultaItems: NavItem[] = [
                {
                    name: "Consulta de inventario",
                    href: "/dashboard/consulta-inventario",
                    icon: MagnifyingGlassIcon,
                },
                {
                    name: "Historial de movimientos",
                    href: "/dashboard/historial-movimientos",
                    icon: HistoryIcon,
                },
            ];
            const operatorEstructuraItems: NavItem[] = [
                {
                    name: "Estructura de bodegas",
                    href: "/dashboard/infrastructure",
                    icon: BoxIcon,
                },
            ];

            navGroups.push(
                {
                    title: "ENTRADA Y AJUSTES",
                    items: operatorEntradaItems,
                },
                {
                    title: "CONSULTA Y TRAZABILIDAD",
                    items: operatorConsultaItems,
                },
                {
                    title: "UBICACIÓN",
                    items: operatorEstructuraItems,
                }
            );
        }
    } else if (role === UserRole.CLIENT) {
        const clientItems: NavItem[] = [
            ...(isBusinessProcessVisible("warehouseStructure")
                ? [{
                    name: "Mis bodegas",
                    href: "/dashboard/my-inventory",
                    icon: BoxIcon,
                }]
                : []),
            ...(isBusinessProcessVisible("contracts")
                ? [{
                    name: "Mis contratos y pagos",
                    href: "/dashboard/client/contracts",
                    icon: CurrencyDollarIcon,
                }]
                : []),
        ];
        if (clientItems.length > 0) {
            navGroups.push({
                title: "SERVICIOS",
                items: clientItems,
            });
        }
    }

    return (
        <AuthGuard fallback={<DashboardShellFallback />}>
            <div
                className="min-h-screen flex"
                style={{ background: "var(--color-surface-sunken)" }}
            >
                {isMobileNavOpen ? (
                    <div
                        className="fixed inset-0 z-40 bg-black/45 md:hidden"
                        onClick={() => setIsMobileNavOpen(false)}
                        aria-hidden="true"
                    />
                ) : null}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r transition-transform duration-300 md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : ""} ${isSidebarCollapsed ? "md:w-20" : "md:w-64"}`}
                    style={{
                        background: "var(--color-sidebar-bg)",
                        borderColor: "var(--color-sidebar-border)",
                    }}
                >
                    <div
                        className={`h-16 flex items-center px-4 border-b relative ${isSidebarCollapsed ? "justify-center" : "justify-center"}`}
                        style={{ borderColor: "var(--color-sidebar-border)" }}
                    >
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Brand
                                    variant="logomarca"
                                    surfaceTone="dark"
                                    alt="Logomarca Nexus"
                                    className="h-10 w-auto shrink-0 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                                />
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`hidden p-1.5 rounded-md text-[var(--color-sidebar-text)] hover:bg-white/10 transition-colors shrink-0 md:inline-flex ${isSidebarCollapsed ? "" : "md:absolute md:right-4"}`}
                            title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
                        >
                            {isSidebarCollapsed ? (
                                <MenuIcon className="w-5 h-5" />
                            ) : (
                                <ChevronLeftIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {/* Header del Sidebar: Perfil y Logout */}
                    <div className="border-b p-3 transition-all duration-300" style={{ borderColor: "var(--color-sidebar-border)" }}>
                        <div className={`flex items-center ${isSidebarCollapsed ? "flex-col justify-center gap-2" : "gap-2"}`}>
                            {/* Profile Button */}
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className={`flex items-center rounded-xl transition-all duration-300 group hover:bg-[var(--color-sidebar-item-hover)] text-left flex-1 min-w-0 ${isSidebarCollapsed ? "p-1 justify-center" : "p-2 gap-3"}`}
                                title="Ver Perfil"
                            >
                                <div className={`w-10 h-10 ring-2 ring-transparent group-hover:ring-[var(--color-primary-default)] text-sm shrink-0 rounded-full flex items-center justify-center font-bold shadow-sm bg-gradient-to-br from-[var(--color-brand-strong)] to-[var(--color-primary-default)] text-[var(--color-text-onbrand)] transition-all overflow-hidden relative`}>
                                    {userProfile?.avatarUrl ? (
                                        <div 
                                            className="w-full h-full absolute inset-0 transition-transform duration-500 group-hover:scale-110" 
                                            style={{ 
                                                backgroundImage: `url(/avatars-sprite.jpg)`,
                                                backgroundSize: '380% 255%',
                                                backgroundPosition: userProfile.avatarUrl,
                                                backgroundColor: 'var(--color-surface-hover)'
                                            }}
                                        />
                                    ) : (
                                        user?.first_name?.charAt(0) || "U"
                                    )}
                                </div>
                                
                                {!isSidebarCollapsed && (
                                    <div className="flex flex-1 min-w-0 flex-col items-start justify-center gap-1">
                                        <span
                                            className="max-w-full truncate text-sm font-semibold leading-tight transition-colors"
                                            style={{ color: "var(--color-sidebar-text-active)" }}
                                        >
                                            {sessionDisplayName}
                                        </span>
                                        <span
                                            className="max-w-full truncate text-[11px] font-medium leading-tight opacity-75"
                                            style={{ color: "var(--color-sidebar-text)" }}
                                        >
                                            {sessionEmail}
                                        </span>
                                        <span
                                            className="mt-0.5 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide truncate"
                                            style={{
                                                background: "var(--color-brand-subtle)",
                                                color: "var(--color-brand-strong)",
                                            }}
                                            title={sessionRoleLabel}
                                        >
                                            {sessionRoleLabel}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Logout Button */}
                            <button
                                className={`flex items-center justify-center rounded-lg text-[var(--color-danger-default)] hover:bg-[var(--color-danger-subtle)] transition-all shrink-0 ${isSidebarCollapsed ? "w-10 h-10" : "w-10 h-10"}`}
                                onClick={() => signOut()}
                                title="Cerrar sesión"
                            >
                                <LogoutIcon className="w-5 h-5 shrink-0" />
                            </button>
                        </div>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
                        {navGroups.map((group, groupIndex) => (
                            <div
                                key={groupIndex}
                                className={groupIndex > 0 ? "mt-6" : ""}
                            >
                                {group.title && !isSidebarCollapsed ? (
                                    <h3
                                        className="px-3 mb-2 text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            color: "var(--color-text-tertiary)",
                                        }}
                                    >
                                        {group.title}
                                    </h3>
                                ) : (group.title && isSidebarCollapsed ? <div className="h-4 border-b w-8 mx-auto mb-2 opacity-20" style={{ borderColor: "var(--color-sidebar-text)" }}></div> : null)}

                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                title={isSidebarCollapsed ? item.name : undefined}
                                                className={`flex items-center rounded-lg transition-colors text-sm font-medium ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"}`}
                                                style={{
                                                    background: isActive
                                                        ? "var(--color-sidebar-item-active)"
                                                        : "transparent",
                                                    color: isActive
                                                        ? "var(--color-sidebar-text-active)"
                                                        : "var(--color-sidebar-text)",
                                                }}
                                                onMouseOver={(event) => {
                                                    if (!isActive) {
                                                        event.currentTarget.style.background =
                                                            "var(--color-sidebar-item-hover)";
                                                    }
                                                }}
                                                onMouseOut={(event) => {
                                                    if (!isActive) {
                                                        event.currentTarget.style.background =
                                                            "transparent";
                                                    }
                                                }}
                                                onClick={() => setIsMobileNavOpen(false)}
                                            >
                                                <item.icon
                                                    className="w-5 h-5 shrink-0"
                                                    style={{
                                                        color: isActive
                                                            ? "var(--color-sidebar-icon-active)"
                                                            : "var(--color-sidebar-icon)",
                                                    }}
                                                />
                                                {!isSidebarCollapsed && <span>{item.name}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>




                </aside>

                <main className="flex-1 flex flex-col min-w-0">
                    <header
                        className="h-20 border-b flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md"
                        style={{
                            background: "var(--color-surface-app)",
                            borderColor: "var(--color-border-subtle)",
                        }}
                    >
                        <div className="flex items-center gap-3 md:hidden">
                            <button
                                onClick={() => setIsMobileNavOpen((current) => !current)}
                                className="p-2 rounded-md"
                                style={{ color: "var(--color-text-secondary)" }}
                                aria-label="Abrir menú de navegación"
                            >
                                <MenuIcon className="w-6 h-6" />
                            </button>
                            <Brand
                                variant="isotipo"
                                alt="Isotipo Nexus"
                                className="h-6 w-6 object-contain"
                            />
                        </div>

                        {metadata && (
                            <div className="hidden md:flex flex-col">
                                <h1
                                    className="text-xl font-bold tracking-tight"
                                    style={{ color: "var(--color-text-primary)" }}
                                >
                                    {metadata.title}
                                </h1>
                                <p className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                                    {metadata.description}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            <AccessibilityMenu />
                            <div className="flex md:hidden items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm bg-gradient-to-br from-[var(--color-brand-strong)] to-[var(--color-primary-default)] text-[var(--color-text-onbrand)] overflow-hidden relative">
                                    {userProfile?.avatarUrl ? (
                                        <div 
                                            className="w-full h-full absolute inset-0" 
                                            style={{ 
                                                backgroundImage: `url(/avatars-sprite.jpg)`,
                                                backgroundSize: '380% 255%',
                                                backgroundPosition: userProfile.avatarUrl,
                                                backgroundColor: 'var(--color-surface-hover)'
                                            }}
                                        />
                                    ) : (
                                        user?.first_name?.charAt(0) || "U"
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="icon"
                                    className="md:hidden shrink-0 shadow-sm"
                                    onClick={() => signOut()}
                                    title="Cerrar sesión"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogoutIcon className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </header>

                    {authState.error ? (
                        <div className="px-6 pt-6 md:px-8">
                            <Alert variant="danger" className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-semibold">Acceso denegado</p>
                                    <p>{authState.error}</p>
                                </div>
                                <button
                                    type="button"
                                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-surface-hover/90"
                                    onClick={() => authStore.clearError()}
                                >
                                    Cerrar
                                </button>
                            </Alert>
                        </div>
                    ) : null}

                    <div className="p-6 md:p-8 flex-1 overflow-auto flex flex-col">
                        <div className="flex-1">
                            {children}
                        </div>
                        <LegalFooter />
                    </div>
                </main>
            </div>
            
            <UserProfileModal 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                currentUserName={sessionDisplayName}
                currentUserEmail={sessionEmail}
                sessionRoles={user?.roles}
                onSave={(data) => setUserProfile(data)}
            />
        </AuthGuard>
    );
}

function DashboardShellFallback() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ background: "var(--color-surface-sunken)" }}
        >
            <div
                className="w-full max-w-md rounded-2xl border p-6 animate-pulse"
                style={{
                    background: "var(--color-surface-app)",
                    borderColor: "var(--color-border-subtle)",
                }}
            >
                <div className="h-5 w-32 rounded-md bg-[var(--color-surface-hover)]" />
                <div className="mt-6 space-y-3">
                    <div className="h-4 rounded-md bg-[var(--color-surface-hover)]" />
                    <div className="h-4 rounded-md bg-[var(--color-surface-hover)]" />
                    <div className="h-4 w-2/3 rounded-md bg-[var(--color-surface-hover)]" />
                </div>
            </div>
        </div>
    );
}

function HomeIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
}

function BoxIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>;
}

function TruckReceiveIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5m12.75 0h2.25M19.5 7.125v11.25c0 .621-.504 1.125-1.125 1.125H18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h4.125m4.125 0a48.11 48.11 0 0 1-3.408.392m0 0a1.125 1.125 0 0 0-1.591 0l-1.591 1.591M5.25 20.25h12M17.25 20.25v-4.5m0 0V8.25m0 0h1.875c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125H17.25" />
        </svg>
    );
}

function ArrowsRightLeftIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
    );
}

function BuildingOfficeIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
    );
}

function MagnifyingGlassIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
    );
}

function HistoryIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

function BellAlertIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
    );
}

function CameraScannerIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h2.25m5.25 0h2.25M9 3h6l2.25 2.25H21v12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25V5.25L5.25 3H9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
        </svg>
    );
}

function ClipboardListIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75h3.375c.621 0 1.125-.504 1.125-1.125V18.75m0 0H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
    );
}

function ClipboardIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>;
}

function MenuIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
}

function DocumentTextIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}

function CurrencyDollarIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>;
}

function TagIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
    );
}

function CubeIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
    );
}

function SwatchIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0L19.5 9.804a3.75 3.75 0 0 0-5.304-5.304L4.098 14.598a3.75 3.75 0 0 0 0 5.304Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18h7.5" />
        </svg>
    );
}

function ArrowPathIcon({ className, style }: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    );
}

function LogoutIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
}

function ChevronLeftIcon({ className, style }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>;
}
