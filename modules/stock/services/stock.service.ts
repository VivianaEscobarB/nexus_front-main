import { httpClient } from "@/shared/api/httpClient";
import type {
    MovementType,
    PaginatedResponse,
    PaginationParams,
    Product,
    WarehouseMovement,
} from "@/types";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

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

function toQueryParams(
    value?: ProductFilters | MovementFilters
): QueryParams | undefined {
    return value ? (value as QueryParams) : undefined;
}

export function getProducts(
    filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
    return httpClient.get<PaginatedResponse<Product>>("/products", {
        query: toQueryParams(filters),
    });
}

export function getProductById(id: string): Promise<Product> {
    return httpClient.get<Product>(`/products/${id}`);
}

export function createProduct(
    payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "stock">
): Promise<Product> {
    return httpClient.post<Product>("/products", payload);
}

export function updateProduct(
    id: string,
    payload: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<Product> {
    return httpClient.patch<Product>(`/products/${id}`, payload);
}

export function deleteProduct(id: string): Promise<void> {
    return httpClient.delete<void>(`/products/${id}`);
}

export function getMovements(
    filters?: MovementFilters
): Promise<PaginatedResponse<WarehouseMovement>> {
    return httpClient.get<PaginatedResponse<WarehouseMovement>>(
        "/stock/movements",
        {
            query: toQueryParams(filters),
        }
    );
}

export function createMovement(
    payload: CreateMovementDto
): Promise<WarehouseMovement> {
    return httpClient.post<WarehouseMovement>("/stock/movements", payload);
}

export function adjustStock(
    payload: AdjustStockDto
): Promise<WarehouseMovement> {
    return httpClient.post<WarehouseMovement>("/stock/adjust", payload);
}
