import { create } from "zustand";
import {
    createWarehouse,
    deleteWarehouse,
    listWarehouses,
    updateWarehouse,
} from "../api/infrastructureApi";
import type {
    CreateWarehouseInput,
    ManagedWarehouse,
    UpdateWarehouseInput,
} from "../api/infrastructureTypes";

interface InfrastructureState {
    warehouses: ManagedWarehouse[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchWarehouses: () => Promise<void>;
    addWarehouse: (input: CreateWarehouseInput) => Promise<void>;
    editWarehouse: (id: string, input: UpdateWarehouseInput) => Promise<void>;
    removeWarehouse: (id: string) => Promise<void>;
}

export const useInfrastructureStore = create<InfrastructureState>((set) => ({
    warehouses: [],
    isLoading: false,
    error: null,

    fetchWarehouses: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await listWarehouses();
            set({ warehouses: data, isLoading: false });
        } catch (error: unknown) {
            set({
                error: error instanceof Error ? error.message : "Error al cargar las bodegas",
                isLoading: false,
            });
        }
    },

    addWarehouse: async (input: CreateWarehouseInput) => {
        set({ isLoading: true, error: null });
        try {
            const newWarehouse = await createWarehouse(input);
            set((state) => ({
                warehouses: [...state.warehouses, newWarehouse],
                isLoading: false,
            }));
        } catch (error: unknown) {
            set({
                error: error instanceof Error ? error.message : "Error al crear la bodega",
                isLoading: false,
            });
            throw error; // Rethrow to handle in UI components (e.g. toasts)
        }
    },

    editWarehouse: async (id: string, input: UpdateWarehouseInput) => {
        set({ isLoading: true, error: null });
        try {
            const updatedWarehouse = await updateWarehouse(id, input);
            set((state) => ({
                warehouses: state.warehouses.map((w) =>
                    w.id === id ? updatedWarehouse : w
                ),
                isLoading: false,
            }));
        } catch (error: unknown) {
            set({
                error: error instanceof Error ? error.message : "Error al actualizar la bodega",
                isLoading: false,
            });
            throw error;
        }
    },

    removeWarehouse: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await deleteWarehouse(id);
            set((state) => ({
                warehouses: state.warehouses.filter((w) => w.id !== id),
                isLoading: false,
            }));
        } catch (error: unknown) {
            set({
                error: error instanceof Error ? error.message : "Error al eliminar la bodega",
                isLoading: false,
            });
            throw error;
        }
    },
}));
