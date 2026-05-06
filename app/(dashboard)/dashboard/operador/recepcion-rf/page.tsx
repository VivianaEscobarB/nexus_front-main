"use client";

import { RoleGuard } from "@/modules/auth";
import { RfGoodsReceiptView } from "@/modules/warehouse/components/RfGoodsReceiptView";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { UserRole } from "@/types";

export default function RecepcionRfPage() {
    return (
        <ProcessVisibilityGuard process="warehouseStructure">
            <RoleGuard allowedRoles={[UserRole.WAREHOUSE_OPERATOR]}>
                <RfGoodsReceiptView />
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
