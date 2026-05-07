"use client";

import { RoleGuard } from "@/modules/auth";
import { SystemAlertsView } from "@/modules/supervisor/components/SystemAlertsView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function AlertasSistemaPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_SUPERVISOR]}>
                <SystemAlertsView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
