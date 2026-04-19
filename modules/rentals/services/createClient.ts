import { httpClient } from "@/shared/api/httpClient";
import type { Client } from "../types/Client";

export interface CreateClientInput {
    name: string;
    email: string;
    phone: string;
    documentNumber: string;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
    const response = await httpClient.post<unknown>("/api/users/clients", input);
    return response as Client;
}
