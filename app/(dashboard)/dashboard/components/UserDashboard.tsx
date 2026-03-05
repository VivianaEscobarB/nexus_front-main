"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import type { Notification } from "@/types";

// Icons
function ClipboardIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>; }
function CheckIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>; }
function BellIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>; }

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        notification_id: "NOT-01",
        type: "INFO",
        message: "Llegó un nuevo pedido. Favor revisar en muelle 1.",
        sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: "UNREAD",
        user_id: "usr_oper_02",
        contract_id: null
    },
    {
        notification_id: "NOT-02",
        type: "WARNING",
        message: "Stock críticamente bajo en pasillo 4B.",
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: "READ",
        user_id: "usr_oper_02",
        contract_id: null
    }
];

export function UserDashboard() {
    const { user } = useAuth();
    const unreadCount = MOCK_NOTIFICATIONS.filter(n => n.status === "UNREAD").length;

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Hola, {user?.first_name || "Operador"}
                    </h1>
                    <p className="mt-1 text-lg" style={{ color: "var(--color-text-secondary)" }}>
                        Tienes {unreadCount} mensajes críticos pendientes.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" size="sm">
                        <BellIcon />
                        <span className="ml-2">Notificaciones ({unreadCount})</span>
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl border transition-all hover:shadow-sm" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-center gap-3 mb-2" style={{ color: "var(--color-brand-strong)" }}>
                        <ClipboardIcon />
                        <h3 className="font-semibold text-sm">Tareas Pendientes</h3>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>3</p>
                </div>
                <div className="p-6 rounded-2xl border transition-all hover:shadow-sm" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-center gap-3 mb-2" style={{ color: "var(--color-success-strong)" }}>
                        <CheckIcon />
                        <h3 className="font-semibold text-sm">Completadas hoy</h3>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>12</p>
                </div>
                <div className="p-6 rounded-2xl border transition-all hover:shadow-sm" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-center gap-3 mb-2" style={{ color: "var(--color-warning-strong)" }}>
                        <BellIcon />
                        <h3 className="font-semibold text-sm">Problemas Críticos</h3>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: "var(--color-warning-strong)" }}>{MOCK_NOTIFICATIONS.filter(n => n.type === 'WARNING').length}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div className="flex flex-col gap-6">
                    {/* Listado de notificaciones BD */}
                    <section className="rounded-2xl border p-6" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                            Mis Alertas
                        </h2>
                        <ul className="space-y-3">
                            {MOCK_NOTIFICATIONS.map(notification => (
                                <li key={notification.notification_id} className="flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-[var(--color-border-default)] transition-colors" style={{ background: notification.status === 'UNREAD' ? "var(--color-brand-subtle)" : "var(--color-surface-hover)" }}>
                                    <div className="mt-0.5 shrink-0" style={{ color: notification.status === 'UNREAD' ? "var(--color-brand-strong)" : "var(--color-text-tertiary)" }}>
                                        <BellIcon />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                                            {notification.type === 'WARNING' ? '⚠️ Precaución' : 'Información'}
                                        </h4>
                                        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{notification.message}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                                            <span>{new Intl.DateTimeFormat('es-ES', { timeStyle: 'short' }).format(new Date(notification.sent_at))}</span>
                                            {notification.status === 'UNREAD' && <span className="font-medium" style={{ color: "var(--color-brand-strong)" }}>Nuevo</span>}
                                        </div>
                                    </div>
                                    {notification.status === 'UNREAD' && (
                                        <Button variant="outline" size="sm" className="shrink-0 text-xs text-brand-strong border-brand-light hover:bg-brand-subtle">
                                            Revisar
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Actividad Reciente */}
                    <section className="col-span-1 border-t lg:border-t-0 p-6 pt-0 lg:p-0">
                        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Actividad reciente</h2>
                        <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-[var(--color-border-default)]">
                            {/* Item timeline */}
                            <div className="relative">
                                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 bg-[var(--color-surface-base)]" style={{ borderColor: "var(--color-brand-default)" }}></div>
                                <h4 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Ajuste de inventario</h4>
                                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Hace 2 horas</p>
                                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Se agregaron 50x "Laptops Pro" a la bodega B.</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 bg-[var(--color-surface-base)]" style={{ borderColor: "var(--color-border-strong)" }}></div>
                                <h4 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Despacho exitoso</h4>
                                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Ayer, 16:30 hrs</p>
                                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Ruta sur cerrada con 15 pedidos entregados.</p>
                            </div>
                        </div>
                    </section>
                </div>

            </div>
        </div>
    );
}
