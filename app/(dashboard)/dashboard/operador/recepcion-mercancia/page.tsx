"use client";

import { RoleGuard } from "@/modules/auth";
import { MerchandiseReceptionView } from "@/modules/supervisor/components/MerchandiseReceptionView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function RecepcionMercanciaPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_OPERATOR]}>
                <MerchandiseReceptionView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
