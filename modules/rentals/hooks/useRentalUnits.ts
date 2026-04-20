import { useState, useCallback } from "react";
import type { RentalUnit } from "../types/rentalUnit.types";
import { fetchAvailableRentalUnits } from "../services/rentalUnits.api";

export function useRentalUnits() {
    const [units, setUnits] = useState<RentalUnit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchUnits = useCallback(async (startDate: string, endDate: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAvailableRentalUnits(startDate, endDate);
            setUnits(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido al consultar unidades");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        units,
        isLoading,
        error,
        searchUnits
    };
}
