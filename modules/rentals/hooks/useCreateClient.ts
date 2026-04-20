import { useState, useCallback } from "react";
import type { Client } from "../types/Client";
import { createClient as apiCreateClient } from "../services/createClient";
import type { CreateClientInput } from "../services/createClient";
import { isApiError } from "@/shared/api/apiError";

export function useCreateClient() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createClient = useCallback(async (input: CreateClientInput): Promise<Client | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiCreateClient(input);
            return data;
        } catch (err: unknown) {
            let errorMsg = "Error inesperado al crear el cliente.";
            if (isApiError(err)) {
                errorMsg =
                    err.message?.trim() ||
                    (err.status === 400 || err.status === 409
                        ? "Los datos enviados no son válidos o el cliente ya existe."
                        : errorMsg);
            }
            setError(errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        createClient,
        isLoading,
        error
    };
}
