"use client";

import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types";
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

    const role = user.roles?.[0]?.role_name || "OPERATOR";

    const renderDashboard = () => {
        switch (role) {
            case "ADMIN":
                return <AdminDashboard />;
            case "SUPERVISOR":
                return <SupervisorDashboard />;
            case "SALES_AGENT":
                return <SalesDashboard />;
            case "CLIENT":
                return <ClientDashboard />;
            case "OPERATOR":
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
