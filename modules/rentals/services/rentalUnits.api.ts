import { listRentalUnits } from "@/modules/sales";
import type { RentalUnit } from "../types/rentalUnit.types";

/** Lista unidades; con rango de fechas el backend puede filtrar y enviar availabilityStatus. */
export async function fetchAvailableRentalUnits(
    startDate?: string,
    endDate?: string
): Promise<RentalUnit[]> {
    const hasRange = Boolean(startDate?.trim() || endDate?.trim());
    return listRentalUnits(
        hasRange
            ? { startDate: startDate?.trim() ?? "", endDate: endDate?.trim() ?? "" }
            : undefined
    );
}
