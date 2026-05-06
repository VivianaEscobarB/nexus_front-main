"use client";

import { RoleGuard } from "@/modules/auth";
import { MovementHistoryView } from "@/modules/warehouse/components/MovementHistoryView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function HistorialMovimientosPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_SUPERVISOR, UserRole.WAREHOUSE_OPERATOR]}>
                <MovementHistoryView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
