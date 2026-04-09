"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody } from "@/components/ui";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";

function LockIcon() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
}

function CheckCircle() {
    return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}

export default function CheckoutSimulationPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-[var(--color-text-secondary)]">Preparando el pago...</div>}>
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
    const paymentReference = useMemo(() => {
        const source = `${contractId ?? "TEMP"}-${client ?? "CLIENT"}`;
        const normalized = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return `TX-${normalized.slice(-8).padStart(8, "0")}`;
    }, [client, contractId]);

    const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "APPROVED" | "FAILED">("PENDING");
    const [secondsLeft, setSecondsLeft] = useState(172800);

    useEffect(() => {
        if (status !== "PENDING") return;

        const interval = setInterval(() => {
            setSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handlePaymentSim = () => {
        setStatus("PROCESSING");

        setTimeout(() => {
            setStatus("APPROVED");
        }, 2000);
    };

    if (status === "APPROVED") {
        return (
            <ProcessVisibilityGuard process="contracts">
                <div className="max-w-2xl mx-auto mt-12 animate-in zoom-in-95 duration-500">
                    <Card padding="lg" className="text-center">
                        <CardBody className="flex flex-col items-center justify-center space-y-6">
                            <CheckCircle />
                            <div>
                                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">¡Pago aprobado!</h2>
                                <p className="text-[var(--color-text-secondary)] mt-2">
                                    El contrato {contractId} ha sido activado. La disponibilidad de la bodega fue actualizada correctamente.
                                </p>
                            </div>
                            <div className="bg-[var(--color-surface-hover)] w-full p-4 rounded-lg mt-4 grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <span className="text-xs uppercase text-[var(--color-text-secondary)] font-bold">Referencia</span>
                                    <p className="font-medium text-sm">{paymentReference}</p>
                                </div>
                                <div>
                                    <span className="text-xs uppercase text-[var(--color-text-secondary)] font-bold">Estado del contrato</span>
                                    <p className="font-medium text-sm text-[var(--color-success-strong)]">Vigente</p>
                                </div>
                            </div>
                            <Button variant="primary" onClick={() => router.push("/dashboard/sales/catalog")} className="mt-4 w-full">
                                Volver al catálogo
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            </ProcessVisibilityGuard>
        );
    }

    return (
        <ProcessVisibilityGuard process="contracts">
            <div className="max-w-md mx-auto mt-10 space-y-6 animate-in fade-in duration-500">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Confirmación de pago</h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Revisa los datos y confirma el pago para activar el contrato.</p>
                </div>

                <Card padding="none" className="overflow-hidden">
                    <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border-subtle)] p-6 text-center">
                        <span className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">Total a pagar</span>
                        <h2 className="text-4xl font-black mt-2 text-[var(--color-text-primary)]">
                            ${Number(amount || 0).toLocaleString()} <span className="text-lg font-medium text-[var(--color-text-secondary)]">COP</span>
                        </h2>
                    </div>

                    <CardBody className="space-y-6 p-6">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                                <span className="text-[var(--color-text-secondary)]">Cliente</span>
                                <span className="font-semibold text-[var(--color-text-primary)]">{client || "Sin dato"}</span>
                            </div>
                            <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                                <span className="text-[var(--color-text-secondary)]">Contrato</span>
                                <span className="font-semibold text-[var(--color-text-primary)]">{contractId || "Sin dato"}</span>
                            </div>
                            <div className="flex justify-between border-b border-[var(--color-border-subtle)] pb-2">
                                <span className="text-[var(--color-text-secondary)]">Servicios básicos</span>
                                <span className="font-semibold text-green-600">Incluidos</span>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg p-4 flex items-start gap-3">
                            <div className="mt-0.5 text-amber-600 dark:text-amber-500">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0 1 18 0z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Tiempo disponible para pagar</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Si no se completa el pago a tiempo, la reserva se liberará automáticamente.</p>
                                <p className="text-lg font-mono font-bold text-amber-800 dark:text-amber-400 mt-2">{formatTime(secondsLeft)}</p>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full flex items-center justify-center gap-2"
                            size="lg"
                            onClick={handlePaymentSim}
                            isLoading={status === "PROCESSING"}
                            disabled={secondsLeft === 0}
                        >
                            <LockIcon /> {status === "PROCESSING" ? "Procesando pago..." : "Confirmar pago"}
                        </Button>
                        <p className="text-[10px] text-center text-[var(--color-text-secondary)] pt-2">
                            Al confirmar el pago, el contrato quedará activo y la disponibilidad se actualizará automáticamente.
                        </p>
                    </CardBody>
                </Card>
            </div>
        </ProcessVisibilityGuard>
    );
}
