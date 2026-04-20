"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@/components/ui";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { RoleGuard } from "@/modules/auth";
import {
    listContractPayments,
    getContractById,
    registerPayment,
    getContractMonetaryTotal,
    StripeContractCardPayment,
} from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import type { Contract, Payment } from "@/modules/sales";
import { UserRole } from "@/types";
import { appEnv } from "@/lib/config/env";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        if (error.status === 400) return "Solicitud inválida. Verifica datos de pago y contrato.";
        if (error.status === 401)
            return "Sesión expirada o no enviada al API (cookie de acceso). Vuelva a iniciar sesión.";
        if (error.status === 403) return "No tienes permisos para registrar pagos.";
        if (error.status === 404) return "Contrato o recurso no encontrado.";
        if (error.status === 409) {
            return error.message?.trim()
                ? `Conflicto: ${error.message}`
                : "Conflicto al registrar pago (monto distinto al total, referencia duplicada o estado inválido).";
        }
        return error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return "Ocurrió un error al procesar la solicitud.";
}

function LockIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-green-500 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function InternalCheckoutPage({
    params,
}: {
    params: Promise<{ contractId: string }>;
}) {
    const { contractId: contractIdStr } = use(params);
    const contractId = Number(contractIdStr);
    const router = useRouter();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [contract, setContract] = useState<Contract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Contrato + pagos ───────────────────────────────────
    useEffect(() => {
        if (!contractId) return;
        let cancelled = false;
        setIsLoading(true);
        Promise.all([getContractById(contractId), listContractPayments(contractId)])
            .then(([c, pay]) => {
                if (!cancelled) {
                    setContract(c);
                    setPayments(pay);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setContract(null);
                    setPayments([]);
                    setError(getApiErrorMessage(err));
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [contractId]);

    const contractTotal = contract ? getContractMonetaryTotal(contract) : 0;
    const totalPaid = payments
        .filter((p) => p.paymentStatus === "APPROVED")
        .reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, Math.round((contractTotal - totalPaid) * 100) / 100);
    const isFullyPaid = contract != null && contractTotal > 0 && outstanding <= 0;
    const useStripeCheckout = Boolean(appEnv.stripePublishableKey);

    // ── Confirm: efectivo (sin clave Stripe en el front) ─────────
    const handleConfirm = async () => {
        if (isProcessing || !contract) return;
        if (contractTotal <= 0) {
            setError("El contrato no tiene un total monetario calculable. Revise las líneas del contrato o solicite soporte.");
            return;
        }
        if (isFullyPaid) {
            setError("El total del contrato ya está cubierto por pagos aprobados.");
            return;
        }
        setIsProcessing(true);
        setError(null);

        try {
            const paymentAmount = outstanding > 0 ? outstanding : contractTotal;
            await registerPayment({
                contractId,
                amount: paymentAmount,
                paymentStatus: "APPROVED",
                paymentMethod: "CASH",
                paymentReference: `AGENT-CONFIRM-${contractId}-${Date.now()}`,
            });

            const refreshed = await getContractById(contractId);
            setContract(refreshed);
            if (refreshed.status !== "ACTIVE") {
                setError(
                    `Pago registrado, pero el contrato aún está en ${refreshed.status}. Tras un pago aprobado el backend puede activar el contrato automáticamente; no asumas que hace falta otro paso manual.`
                );
                return;
            }
            setIsCompleted(true);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsProcessing(false);
        }
    };

    // ─────────────────────────────────────────────────────────
    // SUCCESS SCREEN
    // ─────────────────────────────────────────────────────────
    if (isCompleted) {
        return (
            <ProcessVisibilityGuard process="contracts">
                <RoleGuard allowedRoles={[UserRole.SALES_AGENT, UserRole.ADMIN]}>
                    <div className="max-w-xl mx-auto mt-12 animate-in zoom-in-95 duration-500">
                        <Card padding="lg" className="text-center border-t-8 border-t-[var(--color-success-default)] shadow-xl">
                            <CardBody className="flex flex-col items-center space-y-6 py-8">
                                <CheckCircleIcon />

                                <div>
                                    <h2 className="text-3xl font-black text-[var(--color-text-primary)]">
                                        ¡Contrato Formalizado!
                                    </h2>
                                    <p className="text-[var(--color-text-secondary)] mt-2">
                                        El contrato <strong>#{contractId}</strong> fue activado exitosamente.
                                        Las unidades asignadas se encuentran ahora en estado <span className="font-bold text-red-500">OCCUPIED</span>.
                                    </p>
                                </div>

                                {/* Notificación de acceso del cliente */}
                                <div className="w-full bg-[var(--color-brand-subtle)] border border-[var(--color-brand-default)]/30 p-4 rounded-xl text-left">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 mt-0.5 text-[var(--color-brand-strong)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <h4 className="font-bold text-[var(--color-brand-strong)]">Acceso del Cliente Confirmado</h4>
                                            <p className="text-sm text-[var(--color-brand-strong)]/80 mt-1">
                                                El contrato quedó activo y el cliente puede operar desde su portal con su cuenta existente.
                                                Si no tenía cuenta previa, el backend puede crearla o notificarla según la política configurada.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-3 text-left text-sm">
                                    <div className="bg-[var(--color-surface-hover)] p-3 rounded-lg">
                                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Referencia</span>
                                        <p className="font-medium mt-0.5">CONV-{contractId}</p>
                                    </div>
                                    <div className="bg-[var(--color-surface-hover)] p-3 rounded-lg">
                                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Estado</span>
                                        <p className="font-medium mt-0.5 text-[var(--color-success-strong)]">ACTIVE</p>
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => router.push("/dashboard/contracts")}
                                >
                                    Ir al Historial de Contratos
                                </Button>
                            </CardBody>
                        </Card>
                    </div>
                </RoleGuard>
            </ProcessVisibilityGuard>
        );
    }

    // ─────────────────────────────────────────────────────────
    // CONFIRMATION SCREEN
    // ─────────────────────────────────────────────────────────
    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.SALES_AGENT, UserRole.ADMIN]}>
                <div className="max-w-md mx-auto mt-10 space-y-6 animate-in fade-in duration-500 pb-12">

                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Confirmación Comercial
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1 text-balance">
                            Liquida este contrato para bloquear las unidades y activar el acceso del cliente.
                        </p>
                    </div>

                    <Card padding="none" className="shadow-xl border border-[var(--color-border-subtle)] overflow-hidden">

                        {/* Cabecera del contrato */}
                        <div className="bg-[var(--color-primary-subtle)] border-b border-[var(--color-primary-default)]/20 p-6 text-center">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-primary-strong)] tracking-wider">
                                Aprobación Final
                            </span>
                            <h2 className="text-4xl font-black mt-1 text-[var(--color-primary-strong)]">
                                Contrato #{contractId}
                            </h2>
                            {contract && (
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-strong)]/80">
                                    Estado actual: {contract.status}
                                </p>
                            )}
                        </div>

                        <CardBody className="space-y-5 p-6">
                            {isLoading ? (
                                <div className="h-24 rounded-lg bg-[var(--color-surface-hover)] animate-pulse" />
                            ) : contract ? (
                                <>
                                    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-3 text-sm">
                                        <p className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
                                            Total del contrato
                                        </p>
                                        <p className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">
                                            ${contractTotal.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                                            Los precios por línea vienen del catálogo; el pago debe alinearse al total del contrato.
                                        </p>
                                    </div>

                                    {contract.contractRentalUnits.length > 0 ? (
                                        <div>
                                            <p className="text-xs uppercase font-bold text-[var(--color-text-secondary)] mb-2">
                                                Líneas (precios efectivos)
                                            </p>
                                            <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                                                {contract.contractRentalUnits.map((line) => (
                                                    <div
                                                        key={line.contractRentalUnitId}
                                                        className="flex justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2"
                                                    >
                                                        <span className="text-[var(--color-text-secondary)]">
                                                            Unidad #{line.rentalUnitId}
                                                        </span>
                                                        <span className="font-semibold tabular-nums">
                                                            ${line.price.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="flex justify-between text-sm font-semibold">
                                        <span>Pendiente de cobro</span>
                                        <span className="tabular-nums text-[var(--color-primary-strong)]">
                                            ${outstanding.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-[var(--color-danger-strong)]">No se pudo cargar el contrato.</p>
                            )}

                            {/* Pagos existentes */}
                            {isLoading ? null : payments.length > 0 && (
                                <div>
                                    <p className="text-xs uppercase font-bold text-[var(--color-text-secondary)] mb-2">
                                        Pagos Registrados
                                    </p>
                                    <div className="space-y-2">
                                        {payments.map(p => (
                                            <div key={p.paymentId} className="flex justify-between text-sm border-b border-[var(--color-border-subtle)] pb-2">
                                                <span className="text-[var(--color-text-secondary)]">{p.paymentMethod} · {p.paymentReference}</span>
                                                <span className={`font-bold ${p.paymentStatus === "APPROVED" ? "text-[var(--color-success-strong)]" : "text-[var(--color-warning-strong)]"}`}>
                                                    ${p.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-bold pt-1">
                                            <span>Total Abonado</span>
                                            <span className="text-[var(--color-success-strong)]">${totalPaid.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Aviso al agente */}
                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/30 dark:bg-amber-900/20">
                                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Atención</h4>
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                        {useStripeCheckout ? (
                                            <>
                                                Con tarjeta (Stripe test) el cobro usa el <strong>total del contrato</strong> tal
                                                como lo tiene el sistema. La activación del contrato la completa el servidor
                                                cuando recibe el webhook de Stripe; en local debe tener corriendo{" "}
                                                <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">
                                                    stripe listen
                                                </code>{" "}
                                                hacia el API.
                                            </>
                                        ) : (
                                            <>
                                                Se registrará un pago en <strong>efectivo</strong> por el pendiente mostrado.
                                                Tras marcarlo aprobado, el contrato puede pasar a activo según las reglas del
                                                sistema.
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div role="alert" className="rounded border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger-strong)]">
                                    {error}
                                </div>
                            )}

                            {useStripeCheckout && contract && !isFullyPaid ? (
                                <StripeContractCardPayment
                                    contractId={contractId}
                                    amount={contractTotal}
                                    publishableKey={appEnv.stripePublishableKey}
                                    disabled={isLoading || isProcessing}
                                    onError={(msg) => {
                                        setError(msg);
                                    }}
                                    onFinished={(result) => {
                                        setError(null);
                                        setContract(result.contract);
                                        setPayments(result.payments);
                                        if (result.contract.status === "ACTIVE") {
                                            setIsCompleted(true);
                                            return;
                                        }
                                        if (!result.webhookConfirmed) {
                                            setError(
                                                "Stripe confirmó el cobro, pero el sistema aún no muestra el pago aprobado o el contrato activo. Revise Stripe CLI → webhook del API y STRIPE_WEBHOOK_SECRET."
                                            );
                                        } else {
                                            setError(
                                                `Pago registrado; el contrato sigue en estado ${result.contract.status}.`
                                            );
                                        }
                                    }}
                                />
                            ) : null}

                            {!useStripeCheckout ? (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="flex w-full items-center justify-center gap-2"
                                    onClick={handleConfirm}
                                    isLoading={isProcessing}
                                    disabled={
                                        isLoading ||
                                        !contract ||
                                        contractTotal <= 0 ||
                                        isFullyPaid ||
                                        isProcessing
                                    }
                                >
                                    <LockIcon />
                                    {isProcessing
                                        ? "Formalizando contrato..."
                                        : isFullyPaid
                                          ? "Total ya cubierto"
                                          : "Confirmar formalización (efectivo)"}
                                </Button>
                            ) : null}

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => router.back()}
                                disabled={isProcessing}
                            >
                                Volver atrás
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
