"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LegalFooter() {
    const pathname = usePathname();

    return (
        <footer className="w-full text-xs text-[var(--color-text-tertiary)] flex items-center justify-center gap-4 bg-transparent px-6 pb-6 pt-2 font-medium mt-auto">
            <Link href="/terminos-y-condiciones" className="hover:text-[var(--color-primary-default)] hover:underline transition-all">
                Términos y Condiciones
            </Link>
            <span className="opacity-40">&bull;</span>
            <Link href="/politicas-de-seguridad" className="hover:text-[var(--color-primary-default)] hover:underline transition-all">
                Políticas de Seguridad
            </Link>
        </footer>
    );
}
