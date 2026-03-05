import { QueryClient } from "@tanstack/react-query";

/**
 * Instancia compartida de QueryClient.
 * Se configura aquí para que las opciones globales (staleTime, retry, etc.)
 * estén centralizadas y no dispersas en cada useQuery.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Los datos se consideran frescos por 1 minuto; evita re-fetches innecesarios
            staleTime: 60 * 1000,
            // Máximo 1 reintento automático ante error de red
            retry: 1,
            // No re-fetcha automáticamente al recuperar el foco de la ventana
            // (útil en apps de operario que mantienen la pestaña abierta todo el turno)
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
