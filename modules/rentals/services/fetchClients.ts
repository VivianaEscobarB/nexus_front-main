import { httpClient } from "@/shared/api/httpClient";
import type { Client } from "../types/Client";

export async function fetchClients(search?: string): Promise<Client[]> {
    const query = search ? { search } : undefined;
    const response = await httpClient.get<unknown>("/api/users/clients", { query });
    
    // Asumiendo que response puede ser directo array o { data: [] }
    if (Array.isArray(response)) {
        return response as Client[];
    }
    
    if (response && typeof response === "object" && !Array.isArray(response)) {
        const payload = response as Record<string, unknown>;
        if (Array.isArray(payload.data)) return payload.data as Client[];
        if (Array.isArray(payload.items)) return payload.items as Client[];
        if (Array.isArray(payload.content)) return payload.content as Client[];
    }
    
    return [];
}
