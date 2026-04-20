import type { Contract } from "@/modules/sales/api/salesTypes";

/**
 * Total monetario del contrato: prioriza `totalAmount` del backend si viene informado;
 * si no, suma precios efectivos de líneas (post–creación de contrato).
 */
export function getContractMonetaryTotal(contract: Contract): number {
    const t = contract.totalAmount;
    if (typeof t === "number" && Number.isFinite(t) && t >= 0) {
        return t;
    }
    return contract.contractRentalUnits.reduce(
        (sum, u) => sum + (Number.isFinite(u.price) ? u.price : 0),
        0
    );
}
