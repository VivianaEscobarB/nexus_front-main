"use client";

import { RoleGuard } from "@/modules/auth";
import { WarehouseTransferFormView } from "@/modules/supervisor/components/WarehouseTransferFormView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function TransferenciasBodegasPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_SUPERVISOR]}>
                <WarehouseTransferFormView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
