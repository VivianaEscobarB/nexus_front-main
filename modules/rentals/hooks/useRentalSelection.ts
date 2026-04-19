import { useState, useCallback } from "react";
import type { SelectedRentalUnit, RentalUnit } from "../types/rentalUnit.types";

export function useRentalSelection() {
    const [selectedUnits, setSelectedUnits] = useState<SelectedRentalUnit[]>([]);

    const addUnit = useCallback((unit: RentalUnit) => {
        setSelectedUnits(prev => {
            // Evitar duplicados
            if (prev.some(u => u.rentalUnitId === unit.id)) return prev;
            return [...prev, { rentalUnitId: unit.id }];
        });
    }, []);

    const removeUnit = useCallback((unitId: number) => {
        setSelectedUnits(prev => prev.filter(u => u.rentalUnitId !== unitId));
    }, []);

    const isSelected = useCallback((unitId: number) => {
        return selectedUnits.some(u => u.rentalUnitId === unitId);
    }, [selectedUnits]);

    const clearSelection = useCallback(() => {
        setSelectedUnits([]);
    }, []);

    return {
        selectedUnits,
        addUnit,
        removeUnit,
        isSelected,
        clearSelection
    };
}
