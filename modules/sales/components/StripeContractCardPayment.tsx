"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { Button } from "@/components/ui";
import { isApiError } from "@/shared/api/apiError";
import { registerPayment } from "@/modules/sales/api/salesApi";
import { pollContractPaymentAfterStripe } from "@/modules/sales/utils/pollContractPaymentStatus";
import type { Contract, Payment } from "@/modules/sales/api/salesTypes";

export type StripeContractPaymentResult = {
    contract: Contract;
    payments: Payment[];
    /** false si el pago fue aceptado en Stripe pero el servidor aún no reflejó APPROVED/activación (revisar webhook / Stripe CLI). */
    webhookConfirmed: boolean;
};

interface StripeContractCardPaymentProps {
    contractId: number;
    /** Debe ser exactamente `contracts.totalAmount` (misma unidad que envía el API, sin convertir a centavos). */
    amount: number;
    publishableKey: string | null;
    /** Nombre para billing_details en Stripe (opcional). */
    billingName?: string;
    disabled?: boolean;
    onFinished: (result: StripeContractPaymentResult) => void;
    onError: (message: string) => void;
}

export function StripeContractCardPayment({
    contractId,
    amount,
    publishableKey,
    billingName,
    disabled,
    onFinished,
    onError,
}: StripeContractCardPaymentProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const stripeRef = useRef<Stripe | null>(null);
    const cardRef = useRef<StripeCardElement | null>(null);
    const [cardReady, setCardReady] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!publishableKey || !mountRef.current) return undefined;

        let cancelled = false;
        let card: StripeCardElement | null = null;

        void (async () => {
            const stripe = await loadStripe(publishableKey);
            if (cancelled || !mountRef.current || !stripe) return;
            stripeRef.current = stripe;
            const elements = stripe.elements();
            card = elements.create("card", {
                style: {
                    base: {
                        fontSize: "16px",
                        color: "var(--color-text-primary)",
                        "::placeholder": { color: "var(--color-text-tertiary)" },
                    },
                },
            });
            card.mount(mountRef.current);
            card.on("ready", () => {
                if (!cancelled) setCardReady(true);
            });
            cardRef.current = card;
        })();

        return () => {
            cancelled = true;
            setCardReady(false);
            cardRef.current = null;
            stripeRef.current = null;
            card?.unmount();
            card?.destroy();
        };
    }, [publishableKey]);

    const handlePay = useCallback(async () => {
        if (disabled || busy) return;
        const stripe = stripeRef.current;
        const card = cardRef.current;
        if (!publishableKey || !stripe || !card) {
            onError("El formulario de pago no está listo. Comprueba la clave publicable de Stripe.");
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            onError("El monto del contrato no es válido para cobrar.");
            return;
        }

        setBusy(true);
        try {
            const created = await registerPayment({
                contractId,
                amount,
                paymentStatus: "PENDING",
                paymentMethod: "STRIPE",
            });

            const clientSecret = created.stripeClientSecret?.trim();
            const piRef = created.paymentExternalReference?.trim();
            if (!clientSecret) {
                onError(
                    "El servidor no devolvió client secret de Stripe. Verifique que el POST de pagos esté configurado para devolver `stripeClientSecret`."
                );
                return;
            }
            if (!piRef?.startsWith("pi_")) {
                // Aún puede funcionar con client_secret; aviso suave no bloquea
            }

            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card,
                    billing_details: {
                        name: billingName?.trim() || undefined,
                    },
                },
            });

            if (error) {
                onError(error.message ?? "No se pudo confirmar el pago con Stripe.");
                return;
            }

            if (paymentIntent?.status !== "succeeded") {
                onError(
                    `El pago no quedó confirmado en Stripe (estado: ${paymentIntent?.status ?? "desconocido"}).`
                );
                return;
            }

            const poll = await pollContractPaymentAfterStripe(contractId);
            onFinished({
                contract: poll.contract,
                payments: poll.payments,
                webhookConfirmed: poll.ok,
            });
        } catch (e: unknown) {
            let msg = "Error al iniciar o confirmar el pago.";
            if (isApiError(e) && e.status === 401) {
                msg =
                    "Sesión expirada o no enviada al API (cookie de acceso). Vuelva a iniciar sesión y reintente el pago.";
            } else if (e instanceof Error && e.message) {
                msg = e.message;
            }
            onError(msg);
        } finally {
            setBusy(false);
        }
    }, [
        amount,
        billingName,
        busy,
        contractId,
        disabled,
        onError,
        onFinished,
        publishableKey,
    ]);

    if (!publishableKey) {
        return (
            <div
                role="note"
                className="rounded-lg border border-[var(--color-warning-default)]/50 bg-[var(--color-warning-subtle)] p-3 text-sm text-[var(--color-warning-strong)]"
            >
                Para pagar con tarjeta (Stripe test), configure la variable de entorno{" "}
                <code className="rounded bg-[var(--color-surface-hover)] px-1 text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
                con su clave <code className="text-xs">pk_test_…</code>.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                    Datos de la tarjeta
                </p>
                <div
                    ref={mountRef}
                    className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-3"
                />
                {!cardReady ? (
                    <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">Cargando formulario seguro…</p>
                ) : null}
            </div>

            <details className="text-xs text-[var(--color-text-tertiary)]">
                <summary className="cursor-pointer font-medium text-[var(--color-text-secondary)]">
                    Depuración (local)
                </summary>
                <p className="mt-2 leading-relaxed">
                    Tras pagar, el contrato se actualiza cuando el backend recibe el webhook de Stripe. En local ejecute:{" "}
                    <code className="rounded bg-[var(--color-surface-hover)] px-1">
                        stripe listen --forward-to http://localhost:8080/api/payments/webhook/stripe
                    </code>{" "}
                    y configure <code className="rounded bg-[var(--color-surface-hover)] px-1">STRIPE_WEBHOOK_SECRET</code>{" "}
                    con el <code className="text-xs">whsec_…</code> que muestra el CLI. Si el navegador indica éxito pero el
                    estado no cambia, el webhook no está llegando o el secreto no coincide.
                </p>
            </details>

            <Button
                type="button"
                variant="primary"
                onClick={() => void handlePay()}
                isLoading={busy}
                disabled={disabled || busy || !cardReady}
            >
                {busy ? "Procesando…" : "Pagar con tarjeta (Stripe)"}
            </Button>
        </div>
    );
}
