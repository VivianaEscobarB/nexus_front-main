"use client";

import React from "react";
import { Button } from "./Button";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className = "",
}: PaginationProps) {
    if (totalPages <= 1) return null;

    // Generar array de páginas (ej. [1, 2, 3])
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className={`flex items-center justify-center gap-2 py-4 ${className}`}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2"
            >
                <ChevronLeftIcon />
            </Button>

            <div className="flex items-center gap-1">
                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                            ${
                                currentPage === page
                                    ? "bg-[var(--color-brand-strong)] text-[var(--color-text-inverse)] shadow-md"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                            }
                        `}
                    >
                        {page}
                    </button>
                ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2"
            >
                <ChevronRightIcon />
            </Button>
        </div>
    );
}

function ChevronLeftIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
    );
}
