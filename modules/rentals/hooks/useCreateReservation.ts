import { useState, useCallback } from "react";
import type { CreateReservationRequestDTO } from "../types/reservation.dto";
import type { Reservation } from "../mappers/reservation.mapper";
import { createReservation as apiCreateReservation } from "../services/reservation.service";
import { isApiError } from "@/shared/api/apiError";

export function useCreateReservation() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createReservation = useCallback(async (payload: CreateReservationRequestDTO): Promise<Reservation | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiCreateReservation(payload);
            return data;
        } catch (err: unknown) {
            const status = isApiError(err) ? err.status : (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
                setError(
                    isApiError(err) && err.message
                        ? err.message
                        : "Conflicto al crear la reserva (p. ej. unidad no disponible o datos rechazados por el servidor)."
                );
            } else if (status === 401) {
                setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
            } else if (status === 403) {
                setError("No tienes permisos para crear reservas.");
            } else if (status === 400) {
                setError(isApiError(err) ? err.message : "Los datos enviados no son válidos.");
            } else if (isApiError(err)) {
                setError(err.message);
            } else if (err instanceof Error && err.message) {
                setError(err.message);
            } else {
                setError("Error inesperado al crear la reserva.");
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        createReservation,
        isLoading,
        error
    };
}
