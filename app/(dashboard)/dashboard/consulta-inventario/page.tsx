"use client";

import { RoleGuard } from "@/modules/auth";
import { InventoryQueryView } from "@/modules/supervisor/components/InventoryQueryView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function ConsultaInventarioPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_SUPERVISOR, UserRole.WAREHOUSE_OPERATOR]}>
                <InventoryQueryView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
