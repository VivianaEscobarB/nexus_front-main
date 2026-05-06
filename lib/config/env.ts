type ProviderMode = "mock" | "api";
type ApiTarget = "deployed" | "local";

function parseString(
    value: string | undefined,
    fallback: string
): string {
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : fallback;
}

function parseOptionalProviderMode(
    value: string | undefined,
    fallback: ProviderMode
): ProviderMode {
    return value === "api" || value === "mock" ? value : fallback;
}

function parseRequiredAuthProvider(
    value: string | undefined,
    nodeEnv: string
): ProviderMode {
    const normalized = value?.trim();

    if (!normalized) {
        throw new Error(
            "Missing NEXT_PUBLIC_AUTH_PROVIDER. Set it explicitly to 'api' or 'mock'."
        );
    }

    if (normalized !== "api" && normalized !== "mock") {
        throw new Error(
            `Invalid NEXT_PUBLIC_AUTH_PROVIDER='${normalized}'. Use 'api' or 'mock'.`
        );
    }

    if (normalized === "mock" && nodeEnv !== "development") {
        throw new Error(
            "NEXT_PUBLIC_AUTH_PROVIDER=mock is only allowed when NODE_ENV=development."
        );
    }

    return normalized;
}

function parseApiTarget(
    value: string | undefined,
    fallback: ApiTarget
): ApiTarget {
    return value === "local" || value === "deployed" ? value : fallback;
}

function normalizeUrl(value: string): string {
    return value.replace(/\/+$/, "");
}

/** `true` solo si el valor es explícitamente afirmativo; cualquier otro caso usa `fallback`. */
function parsePublicBooleanFlag(
    value: string | undefined,
    fallback: boolean
): boolean {
    if (value === undefined || value === null) {
        return fallback;
    }
    const v = String(value).trim().toLowerCase();
    if (v === "1" || v === "true" || v === "yes" || v === "on") {
        return true;
    }
    if (v === "0" || v === "false" || v === "no" || v === "off") {
        return false;
    }
    return fallback;
}

const apiTarget = parseApiTarget(
    process.env.NEXT_PUBLIC_API_TARGET,
    "deployed"
);

const deployedApiBaseUrl =
    process.env.NEXT_PUBLIC_DEPLOYED_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "https://nexus-api-xhe7.onrender.com";

const localApiBaseUrl =
    process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL ??
    "http://localhost:8080";

const nodeEnv = parseString(process.env.NODE_ENV, "development");
const isDevelopment = nodeEnv === "development";

const sessionCookieName = parseString(
    process.env.AUTH_SESSION_COOKIE_NAME ??
        process.env.NEXT_PUBLIC_AUTH_SESSION_COOKIE_NAME,
    "access_token"
);

const csrfCookieName = parseString(
    process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME,
    "XSRF-TOKEN"
);

const csrfHeaderName = parseString(
    process.env.NEXT_PUBLIC_CSRF_HEADER_NAME,
    "X-CSRF-TOKEN"
);

const stripePublishableKey = parseString(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ""
);

export const appEnv = {
    apiBaseUrl: normalizeUrl(
        apiTarget === "local" ? localApiBaseUrl : deployedApiBaseUrl
    ),
    apiTarget,
    deployedApiBaseUrl: normalizeUrl(deployedApiBaseUrl),
    localApiBaseUrl: normalizeUrl(localApiBaseUrl),
    nodeEnv,
    isDevelopment,
    authProvider: parseRequiredAuthProvider(
        process.env.NEXT_PUBLIC_AUTH_PROVIDER,
        nodeEnv
    ),
    stockProvider: parseOptionalProviderMode(
        process.env.NEXT_PUBLIC_STOCK_PROVIDER,
        "api"
    ),
    sessionCookieName,
    csrfCookieName,
    csrfHeaderName,
    /** Clave publicable pk_test_… para Stripe.js; vacía si no hay pagos con tarjeta en el navegador. */
    stripePublishableKey: stripePublishableKey.length > 0 ? stripePublishableKey : null,
    /**
     * Cuando sea `true`, el formulario de transferencias entre bodegas se considera integrado con
     * `POST /api/transfers` y se oculta el aviso de demo. Por defecto `false` (UI en modo demostración).
     */
    warehouseTransferApiEnabled: parsePublicBooleanFlag(
        process.env.NEXT_PUBLIC_WAREHOUSE_TRANSFER_API_ENABLED,
        false
    ),
} as const;

export type { ApiTarget, ProviderMode };
