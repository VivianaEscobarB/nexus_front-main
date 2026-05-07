import { useState, useMemo } from "react";

/**
 * usePagination — Una utilidad simple para manejar paginación del lado del cliente.
 */
export function usePagination<T>(data: T[], pageSize: number = 5) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedData = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        const end = start + pageSize;
        return data.slice(start, end);
    }, [data, safeCurrentPage, pageSize]);

    const goToPage = (page: number) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    };

    const nextPage = () => goToPage(safeCurrentPage + 1);
    const prevPage = () => goToPage(safeCurrentPage - 1);

    return {
        paginatedData,
        currentPage: safeCurrentPage,
        totalPages,
        goToPage,
        nextPage,
        prevPage,
        pageSize,
        totalItems: data.length
    };
}
