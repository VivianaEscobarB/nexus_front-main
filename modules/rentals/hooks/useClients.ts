import { useState, useCallback } from "react";
import type { Client } from "../types/Client";
import { fetchClients as apiFetchClients } from "../services/fetchClients";

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchClients = useCallback(async (search?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiFetchClients(search);
            setClients(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido al buscar clientes");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        clients,
        isLoading,
        error,
        searchClients
    };
}
