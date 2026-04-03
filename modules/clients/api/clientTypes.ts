export type ManagedClientStatus = "ACTIVE" | "INACTIVE";

export interface ManagedClient {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    documentType: string | null;
    documentNumber: string | null;
    businessName: string;
    address: string | null;
    cityId: number | null;
    status: ManagedClientStatus;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateClientInput {
    name: string;
    email: string;
    phone: string;
    documentType: string;
    documentNumber: string;
    businessName: string;
    address: string;
    cityId: number;
    status?: ManagedClientStatus;
}

export interface UpdateClientInput {
    name?: string;
    email?: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
    businessName?: string;
    address?: string;
    cityId?: number;
    status?: ManagedClientStatus;
}
