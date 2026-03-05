"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody } from "@/components/ui";

function LockIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
}
function CheckCircle() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}

export default function CheckoutSimulationPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-[var(--color-text-secondary)]">Inicializando pasarela de pagos segura...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const contractId = searchParams.get("contract_id");
    const amount = searchParams.get("amount");
    const client = searchParams.get("client");

    const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "APPROVED" | "FAILED">("PENDING");
    const [secondsLeft, setSecondsLeft] = useState(172800); // 48 hours in seconds

    // Countdown effect
    useEffect(() => {
        if (status !== "PENDING") return;
        const interval = setInterval(() => {
            setSecondsLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handlePaymentSim = () => {
        setStatus("PROCESSING");

        setTimeout(() => {
            // Simulated Success - Disparar Regla 4.2.3 (Reducir Inventario)
            setStatus("APPROVED");
        }, 2000);
    };

    if (status === "APPROVED") {
        return (
            <div className="max-w-2xl mx-auto mt-12 animate-in zoom-in-95 duration-500">
                <Card padding="lg" className="text-center">
                    <CardBody className="flex flex-col items-center justify-center space-y-6">
                        <CheckCircle />
                        <div>
                            <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">¡Pago Aprobado!</h2>
                            <p className="text-[var(--color-text-secondary)] mt-2">
                                El contrato {contractId} ha sido activado.
                                La disponibilidad de la bodega ha sido descontada en metros cuadrados satisfactoriamente según las reglas del sistema.
                            </p>
                        </div>
                        <div className="bg-[var(--color-surface-hover)] w-full p-4 rounded-lg mt-4 grid grid-cols-2 gap-4 text-left">
                            <div>
                                <span className="text-xs uppercase text-[var(--color-text-secondary)] font-bold">Referencia</span>
                                <p className="font-medium text-sm">TX-998{Math.floor(Math.random() * 1000)}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase text-[var(--color-text-secondary)] font-bold">Estado del Contrato</span>
                                <p className="font-medium text-sm text-[var(--color-success-strong)]">Vigente (Asignado)</p>
                            </div>
                        </div>
                        <Button variant="primary" onClick={() => router.push("/dashboard/sales/catalog")} className="mt-4 w-full">
                            Volver al Catálogo
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Simulador Pasarela de Pagos</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Este entorno es exclusivo para QA de reglas de negocio.</p>
            </div>

            <Card padding="none" className="overflow-hidden">
                {/* Visual Header */}
                <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border-subtle)] p-6 text-center">
                    <span className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">Total a Pagar (MENSUAL)</span>
                    <h2 className="text-4xl font-black mt-2 text-[var(--color-text-primary)]">
                        ${Number(amount || 0).toLocaleString()} <span className="text-lg font-medium text-[var(--color-text-secondary)]">COP</span>
                    </h2>
                </div>

                <CardBody className="space-y-6 p-6">
                    {/* Invoice Data */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                            <span className="text-[var(--color-text-secondary)]">Cliente ID</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{client || "Desconocido"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                            <span className="text-[var(--color-text-secondary)]">Referencia de Contrato</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{contractId || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                            <span className="text-[var(--color-text-secondary)]">Metodología de Servicios Básicos</span>
                            <span className="font-semibold text-green-600">Incluido en total</span>
                        </div>
                    </div>

                    {/* Vigencia Control (Regla 4.2.4 Vigencia 48h) */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg p-4 flex items-start gap-3">
                        <div className="mt-0.5 text-amber-600 dark:text-amber-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Vigencia del Link (Regla)</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Este contrato expirará y liberará el bloqueo preventivo si no es pagado antes de acabar el tiempo.</p>
                            <p className="text-lg font-mono font-bold text-amber-800 dark:text-amber-400 mt-2">{formatTime(secondsLeft)}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <Button
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2"
                        size="lg"
                        onClick={handlePaymentSim}
                        isLoading={status === "PROCESSING"}
                        disabled={secondsLeft === 0}
                    >
                        <LockIcon /> {status === "PROCESSING" ? "Autorizando Transacción..." : "Simular Aprobación de Pago"}
                    </Button>
                    <p className="text-[10px] text-center text-[var(--color-text-secondary)] pt-2">
                        Al aprobar certifícas que la transacción externa dio código 200 y se procederá al enganche del contrato a la bodega.
                    </p>
                </CardBody>
            </Card>
        </div>
    );
}
