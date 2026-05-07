"use client";

import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types";
import { getPrimaryRoleName, userHasRole } from "@/shared/auth/primaryRole";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserDashboard } from "./components/UserDashboard"; // operator
import { SupervisorDashboard } from "./components/SupervisorDashboard";
import { SalesDashboard } from "./components/SalesDashboard";
import { ClientDashboard } from "./components/ClientDashboard";

export default function DashboardIndexPage() {
    const { user, isLoading } = useAuth();

    if (isLoading || !user) {
        return (
            <div className="flex bg-[var(--color-surface-sunken)] p-8">
                <div className="animate-pulse flex flex-col gap-4 w-full">
                    <div className="h-10 bg-[var(--color-surface-hover)] rounded-md w-1/4"></div>
                    <div className="h-32 bg-[var(--color-surface-base)] rounded-xl border border-[var(--color-border-subtle)] w-full"></div>
                </div>
            </div>
        );
    }

    const role = getPrimaryRoleName(user.roles, UserRole.WAREHOUSE_OPERATOR);
    const hasSupervisorRole = userHasRole(user.roles, UserRole.WAREHOUSE_SUPERVISOR);

    const renderDashboard = () => {
        // Si un usuario tiene el rol de supervisor junto con otros,
        // priorizamos su panel operativo para que siempre lo pueda consultar.
        if (hasSupervisorRole) {
            return <SupervisorDashboard />;
        }
        switch (role) {
            case UserRole.ADMIN:
                return <AdminDashboard />;
            case UserRole.WAREHOUSE_SUPERVISOR:
                return <SupervisorDashboard />;
            case UserRole.SALES_AGENT:
                return <SalesDashboard />;
            case UserRole.CLIENT:
                return <ClientDashboard />;
            case UserRole.WAREHOUSE_OPERATOR:
            default:
                return <UserDashboard />;
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {renderDashboard()}
        </div>
    );
}
