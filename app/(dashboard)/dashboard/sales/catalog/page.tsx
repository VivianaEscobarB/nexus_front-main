import React from "react";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";
import { RentalReservationFlow } from "@/modules/rentals/components/RentalReservationFlow";

export default function SalesCatalogPage() {
    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
                <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-28">

                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Catálogo de Unidades de Arrendamiento
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            Seleccione el rango de fechas para consultar disponibilidad.
                        </p>
                    </div>

                    {/* Contenedor orquestador refactorizado */}
                    <RentalReservationFlow />

                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
