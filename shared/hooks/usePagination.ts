import { useState, useMemo } from "react";

/**
 * usePagination — Una utilidad simple para manejar paginación del lado del cliente.
 */
export function usePagination<T>(data: T[], pageSize: number = 5) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / pageSize);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return data.slice(start, end);
    }, [data, currentPage, pageSize]);

    // Reset a la página 1 si los datos cambian (ej. por filtros)
    useMemo(() => {
        setCurrentPage(1);
    }, [data.length]);

    const goToPage = (page: number) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    return {
        paginatedData,
        currentPage,
        totalPages,
        goToPage,
        nextPage,
        prevPage,
        pageSize,
        totalItems: data.length
    };
}
