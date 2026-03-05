"use client";

import { useState, useEffect, useRef } from "react";

/**
 * useDebounce — retrasa la actualización de un valor hasta que el usuario
 * deje de modificarlo durante `delay` ms.
 *
 * Útil para buscadores en tiempo real: evita disparar una petición HTTP
 * en cada pulsación de teclado.
 *
 * @param value  Valor reactivo a debounce-ar (string, number, object…)
 * @param delay  Retardo en milisegundos (por defecto: 400 ms)
 *
 * @example
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 500);
 *
 * // debouncedQuery sólo cambia 500ms después de que el usuario pare de escribir
 * const { data } = useProducts({ search: debouncedQuery });
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [value, delay]);

    return debouncedValue;
}
