import { apiClient } from "@/lib/axios";
import type {
    Product,
    WarehouseMovement,
    PaginatedResponse,
    PaginationParams,
    MovementType,
} from "@/types";

// ---------------------------------------------------------------------------
// Stock / Inventario Service
// ---------------------------------------------------------------------------

// --- Tipos de parámetros específicos ---

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
    from?: string; // ISO 8601
    to?: string;   // ISO 8601
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

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

/**
 * Obtiene una lista paginada de productos con filtros opcionales.
 */
export async function getProducts(
    filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
    const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: filters,
    });
    return data;
}

/**
 * Obtiene un producto por su ID.
 */
export async function getProductById(id: string): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
}

/**
 * Crea un nuevo producto.
 */
export async function createProduct(
    payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "stock">
): Promise<Product> {
    const { data } = await apiClient.post<Product>("/products", payload);
    return data;
}

/**
 * Actualiza un producto existente de forma parcial.
 */
export async function updateProduct(
    id: string,
    payload: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<Product> {
    const { data } = await apiClient.patch<Product>(`/products/${id}`, payload);
    return data;
}

/**
 * Elimina un producto (soft-delete en el backend).
 */
export async function deleteProduct(id: string): Promise<void> {
    await apiClient.delete<void>(`/products/${id}`);
}

// ---------------------------------------------------------------------------
// Movimientos de bodega
// ---------------------------------------------------------------------------

/**
 * Obtiene el historial de movimientos paginado con filtros opcionales.
 */
export async function getMovements(
    filters?: MovementFilters
): Promise<PaginatedResponse<WarehouseMovement>> {
    const { data } = await apiClient.get<PaginatedResponse<WarehouseMovement>>(
        "/stock/movements",
        { params: filters }
    );
    return data;
}

/**
 * Registra un nuevo movimiento (entrada, salida, traslado) en el inventario.
 */
export async function createMovement(
    payload: CreateMovementDto
): Promise<WarehouseMovement> {
    const { data } = await apiClient.post<WarehouseMovement>(
        "/stock/movements",
        payload
    );
    return data;
}

/**
 * Realiza un ajuste de inventario (conteo físico).
 * Genera un movimiento de tipo ADJUSTMENT en el backend.
 */
export async function adjustStock(
    payload: AdjustStockDto
): Promise<WarehouseMovement> {
    const { data } = await apiClient.post<WarehouseMovement>(
        "/stock/adjust",
        payload
    );
    return data;
}
