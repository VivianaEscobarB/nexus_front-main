import { isApiError } from "@/shared/api/apiError";

export const ACCOUNT_NOT_ACTIVATED = "ACCOUNT_NOT_ACTIVATED" as const;
export const ACCOUNT_ACTIVATION_REQUIRED_MESSAGE =
    "Tu cuenta aún no ha sido activada. Revisa tu correo o solicita un nuevo acceso.";

export class AccountActivationRequiredError extends Error {
    readonly type = ACCOUNT_NOT_ACTIVATED;
    status: number;

    constructor() {
        super(ACCOUNT_ACTIVATION_REQUIRED_MESSAGE);
        this.name = "AccountActivationRequiredError";
        this.status = 403;
        Object.setPrototypeOf(this, AccountActivationRequiredError.prototype);
    }
}

export function isAccountActivationRequiredError(error: unknown): boolean {
    if (error instanceof AccountActivationRequiredError) {
        return true;
    }

    return (
        isApiError(error) &&
        error.status === 403 &&
        /account not activated/i.test(error.message)
    );
}

export function isAccountNotActivatedLoginError(
    error: unknown
): error is AccountActivationRequiredError {
    return isAccountActivationRequiredError(error);
}

export function normalizeLoginError(
    error: unknown,
    fallback: string
): Error {
    if (isAccountActivationRequiredError(error)) {
        return new AccountActivationRequiredError();
    }

    return error instanceof Error ? error : new Error(fallback);
}
