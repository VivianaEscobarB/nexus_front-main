"use client";

import { RoleGuard } from "@/modules/auth";
import { InventoryMovementFormView } from "@/modules/supervisor/components/InventoryMovementFormView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function MovimientosInventarioPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_OPERATOR]}>
                <InventoryMovementFormView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
