import { apiClient } from "@/lib/http/api-client";
import type {
    MovementType,
    PaginatedResponse,
    PaginationParams,
    Product,
    WarehouseMovement,
} from "@/types";

export interface ProductFilters extends PaginationParams {
    categoryId?: string;
    warehouseId?: string;
    status?: string;
    lowStock?: boolean;
}

export interface MovementFilters extends PaginationParams {
    productId?: string;
    warehouseId?: string;
    type?: MovementType;
    from?: string;
    to?: string;
}

export interface CreateMovementDto {
    productId: string;
    type: MovementType;
    quantity: number;
    destinationWarehouseId?: string;
    referenceNumber?: string;
    notes?: string;
}

export interface AdjustStockDto {
    productId: string;
    newStock: number;
    notes: string;
}

export async function getProducts(
    filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
    const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/products",
        { params: filters }
    );
    return data;
}

export async function getProductById(id: string): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
}

export async function createProduct(
    payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "stock">
): Promise<Product> {
    const { data } = await apiClient.post<Product>("/products", payload);
    return data;
}

export async function updateProduct(
    id: string,
    payload: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<Product> {
    const { data } = await apiClient.patch<Product>(`/products/${id}`, payload);
    return data;
}

export async function deleteProduct(id: string): Promise<void> {
    await apiClient.delete<void>(`/products/${id}`);
}

export async function getMovements(
    filters?: MovementFilters
): Promise<PaginatedResponse<WarehouseMovement>> {
    const { data } = await apiClient.get<PaginatedResponse<WarehouseMovement>>(
        "/stock/movements",
        { params: filters }
    );
    return data;
}

export async function createMovement(
    payload: CreateMovementDto
): Promise<WarehouseMovement> {
    const { data } = await apiClient.post<WarehouseMovement>(
        "/stock/movements",
        payload
    );
    return data;
}

export async function adjustStock(
    payload: AdjustStockDto
): Promise<WarehouseMovement> {
    const { data } = await apiClient.post<WarehouseMovement>(
        "/stock/adjust",
        payload
    );
    return data;
}
