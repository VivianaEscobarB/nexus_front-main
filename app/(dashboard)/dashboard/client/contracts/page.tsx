"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, CardBody } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { ProcessVisibilityGuard } from "@/shared/guards/ProcessVisibilityGuard";
import { useAuth } from "@/hooks/useAuth";
import {
    getContractById,
    listContracts,
    listContractPayments,
    getContractMonetaryTotal,
    StripeContractCardPayment,
} from "@/modules/sales";
import { isApiError } from "@/shared/api/apiError";
import type { Contract, ContractStatus, Payment } from "@/modules/sales";
import { UserRole } from "@/types";
import { appEnv } from "@/lib/config/env";

function getApiErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        if (error.status === 400) return "Datos de pago inválidos. Revisa el monto y el contrato.";
        if (error.status === 401)
            return "Sesión expirada o no enviada al API (cookie de acceso). Vuelva a iniciar sesión.";
        if (error.status === 403) return "No tienes permisos para registrar pagos.";
        if (error.status === 404) return "Contrato no encontrado.";
        if (error.status === 409)
            return (
                error.message?.trim() ||
                "Conflicto de pago (monto distinto al total del contrato o estado inválido)."
            );
        return error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return "No fue posible procesar tu pago.";
}

export default function ClientContractsPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clientId = user?.client_id ? Number(user.client_id) : null;

    const billingName = useMemo(() => {
        const fn = user?.first_name?.trim() ?? "";
        const ln = user?.last_name?.trim() ?? "";
        const full = `${fn} ${ln}`.trim();
        return full || user?.email?.trim() || undefined;
    }, [user?.email, user?.first_name, user?.last_name]);

    const fetchContracts = useCallback(async () => {
        if (!clientId) {
            setContracts([]);
            setSelectedContract(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const all = await listContracts();
            const filtered = all.filter((c) => c.clientId === clientId);
            setContracts(filtered);
            setSelectedContract((prev) => {
                if (!prev) return filtered.length > 0 ? filtered[0] : null;
                return filtered.find((c) => c.contractId === prev.contractId) ?? null;
            });
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [clientId]);

    const fetchPayments = useCallback(async (contractId: number) => {
        setIsLoadingPayments(true);
        try {
            const data = await listContractPayments(contractId);
            setPayments(data);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsLoadingPayments(false);
        }
    }, []);

    useEffect(() => {
        void fetchContracts();
    }, [fetchContracts]);

    useEffect(() => {
        if (!selectedContract) {
            setPayments([]);
            return;
        }
        void fetchPayments(selectedContract.contractId);
    }, [selectedContract, fetchPayments]);

    const totalToPay = selectedContract ? getContractMonetaryTotal(selectedContract) : 0;

    const totalApproved = useMemo(
        () => payments.filter((p) => p.paymentStatus === "APPROVED").reduce((sum, p) => sum + p.amount, 0),
        [payments]
    );

    const nonPayableContractStatuses: ContractStatus[] = ["CANCELLED", "COMPLETED", "EXPIRED"];

    /** Saldo pendiente respecto al total del contrato (cobro Stripe debe alinearse a lo que falta por APPROVED). */
    const outstandingToPay = useMemo(() => {
        if (!Number.isFinite(totalToPay) || totalToPay <= 0) return 0;
        return Math.max(0, Math.round((totalToPay - totalApproved) * 100) / 100);
    }, [totalToPay, totalApproved]);

    const isBalanceCoveredByApprovedPayments =
        Number.isFinite(totalToPay) && totalToPay > 0 && outstandingToPay <= 0.005;

    const canPaySelected =
        selectedContract != null &&
        !nonPayableContractStatuses.includes(selectedContract.status) &&
        Number.isFinite(outstandingToPay) &&
        outstandingToPay > 0.005;

    const refreshContractAndPayments = useCallback(async (contractId: number) => {
        const refreshed = await getContractById(contractId);
        setSelectedContract(refreshed);
        await fetchPayments(contractId);
    }, [fetchPayments]);

    return (
        <ProcessVisibilityGuard process="contracts">
            <RoleGuard allowedRoles={[UserRole.CLIENT]}>
                <div className="mx-auto max-w-6xl animate-in fade-in space-y-6 duration-500">

                    {!clientId ? (
                        <Alert variant="warning" className="rounded-lg">
                            Tu sesión no tiene cliente vinculado. No es posible listar ni pagar contratos hasta que la
                            cuenta quede asociada en el sistema.
                        </Alert>
                    ) : null}

                    {error ? (
                        <Alert variant="danger" className="rounded-lg">
                            {error}
                        </Alert>
                    ) : null}
                    {success ? (
                        <Alert variant="success" role="status" className="rounded-lg">
                            {success}
                        </Alert>
                    ) : null}

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-1">
                            <CardBody className="space-y-3 p-4">
                                <h2 className="font-semibold text-[var(--color-text-primary)]">Contratos</h2>
                                {isLoading ? (
                                    <div className="h-20 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                ) : contracts.length === 0 ? (
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        No tienes contratos visibles por ahora.
                                    </p>
                                ) : (
                                    contracts.map((contract) => (
                                        <button
                                            key={contract.contractId}
                                            type="button"
                                            onClick={() => {
                                                setSelectedContract(contract);
                                                setError(null);
                                                setSuccess(null);
                                            }}
                                            className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                                                selectedContract?.contractId === contract.contractId
                                                    ? "border-[var(--color-primary-default)] bg-[var(--color-primary-subtle)]"
                                                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] hover:bg-[var(--color-surface-hover)]"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Contrato #{contract.contractId}</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">
                                                {contract.startDate} → {contract.endDate}
                                            </p>
                                            <p className="mt-1 text-xs font-bold uppercase">{contract.status}</p>
                                        </button>
                                    ))
                                )}
                            </CardBody>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardBody className="space-y-4 p-4">
                                {!selectedContract ? (
                                    <div className="flex min-h-[150px] items-center justify-center">
                                        <p className="text-base text-[var(--color-text-secondary)]">
                                            Selecciona un contrato para continuar.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h2 className="font-semibold text-[var(--color-text-primary)]">
                                                    Contrato #{selectedContract.contractId}
                                                </h2>
                                                <p className="text-xs text-[var(--color-text-secondary)]">
                                                    Vigencia: {selectedContract.startDate} → {selectedContract.endDate}
                                                </p>
                                            </div>
                                            <span className="rounded px-2 py-1 text-xs font-bold uppercase bg-[var(--color-surface-hover)]">
                                                {selectedContract.status}
                                            </span>
                                        </div>

                                        <div className="rounded border border-[var(--color-border-subtle)] p-3">
                                            <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                                                Total a pagar (contrato)
                                            </p>
                                            <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                                                {Number.isFinite(totalToPay) && totalToPay > 0
                                                    ? totalToPay.toLocaleString("es-CO", {
                                                          style: "currency",
                                                          currency: "COP",
                                                          minimumFractionDigits: 2,
                                                      })
                                                    : "—"}
                                            </p>
                                        </div>

                                        <div className="rounded border border-[var(--color-border-subtle)] p-3">
                                            <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                                                Pagos aprobados
                                            </p>
                                            <p className="text-lg font-bold text-[var(--color-success-strong)]">
                                                {totalApproved.toLocaleString("es-CO", {
                                                    style: "currency",
                                                    currency: "COP",
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                        </div>

                                        {isLoadingPayments ? (
                                            <div className="h-16 animate-pulse rounded bg-[var(--color-surface-hover)]" />
                                        ) : payments.length > 0 ? (
                                            <div className="space-y-2">
                                                {payments.map((payment) => (
                                                    <div
                                                        key={payment.paymentId}
                                                        className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 text-sm"
                                                    >
                                                        <span className="text-[var(--color-text-secondary)]">
                                                            {payment.paymentMethod} · {payment.paymentReference || "—"}
                                                        </span>
                                                        <span className="font-semibold tabular-nums">
                                                            {payment.amount.toLocaleString("es-CO", {
                                                                style: "currency",
                                                                currency: "COP",
                                                                minimumFractionDigits: 2,
                                                            })}{" "}
                                                            · {payment.paymentStatus}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--color-text-secondary)]">
                                                Aún no hay pagos registrados para este contrato.
                                            </p>
                                        )}

                                        <div className="space-y-3 border-t border-[var(--color-border-subtle)] pt-4">
                                            <h3 className="font-semibold text-[var(--color-text-primary)]">Pago con tarjeta</h3>
                                            {!canPaySelected && (
                                                <p className="text-xs text-[var(--color-text-secondary)]">
                                                    {nonPayableContractStatuses.includes(selectedContract.status)
                                                        ? "Este contrato está cancelado, completado o expirado; no admite nuevo pago en línea."
                                                        : isBalanceCoveredByApprovedPayments
                                                          ? "El total del contrato ya está cubierto por pagos aprobados; no es necesario pagar de nuevo."
                                                          : !Number.isFinite(totalToPay) || totalToPay <= 0
                                                            ? "No hay un total monetario válido para cobrar con tarjeta."
                                                            : `Este contrato no admite pago en línea en su estado actual (${selectedContract.status}).`}
                                                </p>
                                            )}
                                            {canPaySelected ? (
                                                <StripeContractCardPayment
                                                    contractId={selectedContract.contractId}
                                                    amount={outstandingToPay}
                                                    publishableKey={appEnv.stripePublishableKey}
                                                    billingName={billingName}
                                                    disabled={!canPaySelected}
                                                    onError={(msg) => {
                                                        setSuccess(null);
                                                        setError(msg);
                                                    }}
                                                    onFinished={(result) => {
                                                        setError(null);
                                                        setSelectedContract(result.contract);
                                                        setPayments(result.payments);
                                                        setContracts((prev) =>
                                                            prev.map((c) =>
                                                                c.contractId === result.contract.contractId
                                                                    ? result.contract
                                                                    : c
                                                            )
                                                        );
                                                        if (result.webhookConfirmed) {
                                                            setSuccess(
                                                                result.contract.status === "ACTIVE"
                                                                    ? "Pago confirmado. Tu contrato quedó activo."
                                                                    : `Pago confirmado. Estado del contrato: ${result.contract.status}.`
                                                            );
                                                        } else {
                                                            setSuccess(
                                                                "Stripe confirmó el cobro, pero el sistema aún no muestra el pago aprobado o el contrato actualizado. " +
                                                                    "En local, ejecute Stripe CLI hacia el webhook del API y configure el secreto que indica el CLI. " +
                                                                    "Use «Actualizar estado» para volver a consultar."
                                                            );
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            {selectedContract ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        void refreshContractAndPayments(selectedContract.contractId)
                                                    }
                                                >
                                                    Actualizar estado
                                                </Button>
                                            ) : null}
                                        </div>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </RoleGuard>
        </ProcessVisibilityGuard>
    );
}
