"use client";

import { RoleGuard } from "@/modules/auth";
import { RfInventoryCountView } from "@/modules/warehouse/components/RfInventoryCountView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function ConteoInventarioRfPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_OPERATOR]}>
                <RfInventoryCountView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
