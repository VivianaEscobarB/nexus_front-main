import type { User } from "@/types";

export type ManagedUserStatus = User["status"];

export interface ManagedUser {
    id: string;
    username: string;
    email: string;
    status: ManagedUserStatus;
    roles: string[];
    clientId: string | null;
    cityId: number | null;
    clientName: string | null;
    createdByName: string | null;
    createdAt: string | null;
    lastLoginAt: string | null;
}

export interface ListUsersParams {
    search?: string;
    role?: string;
    status?: ManagedUserStatus;
}

export interface CreateUserInput {
    username: string;
    email: string;
    status: ManagedUserStatus;
    roles: string[];
    cityId: number;
}

export interface UpdateUserInput {
    username?: string;
    email?: string;
    status?: ManagedUserStatus;
    roles?: string[];
    cityId?: number;
}
