import type { RentalUnit as SalesRentalUnit } from "@/modules/sales";

/** Unidad de arrendamiento (misma forma que API de ventas). */
export type RentalUnit = SalesRentalUnit;

export type SelectedRentalUnit = {
    rentalUnitId: number;
};
