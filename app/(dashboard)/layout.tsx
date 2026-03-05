"use client";

import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
// Removed UserRole import

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAuth();
    const pathname = usePathname();

    const role = user?.roles?.[0]?.role_name || "OPERATOR";

    type NavItem = { name: string; href: string; icon: any };
    type NavGroup = { title?: string; items: NavItem[] };

    let navGroups: NavGroup[] = [
        { items: [{ name: "Inicio", href: "/dashboard", icon: HomeIcon }] }
    ];

    if (role === "ADMIN") {
        navGroups.push({
            title: "ADMINISTRACIÓN",
            items: [
                { name: "Estructura de Bodegas", href: "/dashboard/infrastructure", icon: BoxIcon },
                { name: "Gestión de Usuarios", href: "/dashboard/users/create", icon: ClipboardIcon }
            ]
        });
    } else if (role === "SUPERVISOR") {
        navGroups.push({
            title: "OPERACIONES",
            items: [
                { name: "Auditorías", href: "/dashboard/audits", icon: ClipboardIcon },
            ]
        });
    } else if (role === "SALES_AGENT") {
        navGroups.push({
            title: "PROCESO COMERCIAL",
            items: [
                { name: "Catálogo y Ofertas", href: "/dashboard/sales/catalog", icon: BoxIcon },
                { name: "Generar Contrato", href: "/dashboard/sales/contracts/create", icon: DocumentTextIcon },
            ]
        });
        navGroups.push({
            title: "GESTIÓN Y CARTERA",
            items: [
                { name: "Directorio Comercial", href: "/dashboard/clients", icon: ClipboardIcon },
                { name: "Historial Contratos", href: "/dashboard/contracts", icon: CurrencyDollarIcon },
            ]
        });
    } else if (role === "OPERATOR") {
        navGroups.push({
            title: "BODEGA",
            items: [
                { name: "Entradas/Salidas", href: "/dashboard/movements", icon: TruckIcon },
            ]
        });
    } else if (role === "CLIENT") {
        navGroups.push({
            title: "SERVICIOS",
            items: [
                { name: "Mi Inventario", href: "/dashboard/my-inventory", icon: BoxIcon },
            ]
        });
    }

    return (
        <div className="min-h-screen flex" style={{ background: "var(--color-surface-sunken)" }}>
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r" style={{ background: "var(--color-sidebar-bg)", borderColor: "var(--color-sidebar-border)" }}>
                <div className="h-16 flex items-center px-6 border-b" style={{ borderColor: "var(--color-sidebar-border)" }}>
                    <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="Nexus Logo" className="h-6 w-6 object-contain" />
                        <span className="font-bold text-lg tracking-tight" style={{ color: "var(--color-text-inverse)" }}>Nexus</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navGroups.map((group, gIdx) => (
                        <div key={gIdx} className={gIdx > 0 ? "mt-6" : ""}>
                            {group.title && (
                                <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                                    {group.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.name} href={item.href}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
                                            style={{
                                                background: isActive ? "var(--color-sidebar-item-active)" : "transparent",
                                                color: isActive ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)",
                                            }}
                                            onMouseOver={(e) => !isActive && (e.currentTarget.style.background = "var(--color-sidebar-item-hover)")}
                                            onMouseOut={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
                                        >
                                            <item.icon className="w-5 h-5" style={{ color: isActive ? "var(--color-sidebar-icon-active)" : "var(--color-sidebar-icon)" }} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t" style={{ borderColor: "var(--color-sidebar-border)" }}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group cursor-pointer hover:bg-[var(--color-sidebar-item-hover)]"
                        onClick={() => signOut()}
                        title="Cerrar sesión">
                        <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105"
                            style={{ background: "linear-gradient(135deg, var(--color-brand-strong), var(--color-primary-default))", color: "var(--color-text-inverse)" }}>
                            {user?.first_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-col flex flex-1 min-w-0">
                            <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-inverse)" }}>
                                {user?.first_name} {user?.last_name}
                            </span>
                            <span className="text-xs truncate opacity-80" style={{ color: "var(--color-brand-light)" }}>
                                {user?.roles?.[0]?.role_name || "Usuario"}
                            </span>
                        </div>
                        <button
                            className="p-1.5 -mr-1 rounded-md bg-red-500 text-white shadow-sm shrink-0 opacity-90 group-hover:opacity-100 hover:bg-red-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); signOut(); }}
                            title="Cerrar sesión"
                        >
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Header Mobile / Topbar */}
                <header className="h-16 border-b flex items-center justify-between px-6 bg-white/50 backdrop-blur-md sticky top-0 z-40"
                    style={{ background: "var(--color-surface-app)", borderColor: "var(--color-border-subtle)" }}>

                    {/* Botón menú mobile */}
                    <button className="md:hidden p-2 rounded-md" style={{ color: "var(--color-text-secondary)" }}>
                        <MenuIcon className="w-6 h-6" />
                    </button>

                    <h1 className="text-lg font-semibold tracking-tight hidden md:block" style={{ color: "var(--color-text-primary)" }}>
                        {navGroups.flatMap(g => g.items).find(i => i.href === pathname)?.name || "Dashboard"}
                    </h1>

                    <div className="flex items-center gap-4 ml-auto">
                        <ThemeToggle />
                        <div className="flex md:hidden items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm bg-gradient-to-br from-[var(--color-brand-strong)] to-[var(--color-primary-default)] text-[var(--color-text-inverse)]">
                                {user?.first_name?.charAt(0) || "U"}
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="p-1.5 rounded-md bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
                                title="Cerrar sesión"
                            >
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

// Iconos compartidos del layout
function HomeIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
}
function BoxIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
}
function TruckIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
}
function ClipboardIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
}
function MenuIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
}
function DocumentTextIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function CurrencyDollarIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>;
}
function LogoutIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
}
