import { getContractById, listContractPayments } from "@/modules/sales/api/salesApi";
import type { Contract, Payment } from "@/modules/sales/api/salesTypes";

export type PollContractPaymentResult =
    | { ok: true; contract: Contract; payments: Payment[] }
    | { ok: false; contract: Contract; payments: Payment[]; reason: "timeout" };

/**
 * Tras confirmCardPayment en Stripe, el backend activa el contrato vía webhook.
 * Consulta contrato y pagos cada intervalo hasta ver pago APPROVED y contrato fuera de pendiente de pago.
 */
export async function pollContractPaymentAfterStripe(
    contractId: number,
    options?: { maxAttempts?: number; initialDelayMs?: number; intervalMs?: number }
): Promise<PollContractPaymentResult> {
    const maxAttempts = options?.maxAttempts ?? 12;
    const initialDelayMs = options?.initialDelayMs ?? 600;
    const intervalMs = options?.intervalMs ?? 1500;

    await new Promise((r) => setTimeout(r, initialDelayMs));

    let lastContract: Contract | null = null;
    let lastPayments: Payment[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        const contract = await getContractById(contractId);
        const payments = await listContractPayments(contractId);
        lastContract = contract;
        lastPayments = payments;

        const hasApproved = payments.some((p) => p.paymentStatus === "APPROVED");
        const contractStillAwaitingPayment =
            contract.status === "DRAFT" || contract.status === "PENDING_PAYMENT";

        if (hasApproved && !contractStillAwaitingPayment) {
            return { ok: true, contract, payments };
        }
    }

    return {
        ok: false,
        contract: lastContract as Contract,
        payments: lastPayments,
        reason: "timeout",
    };
}
