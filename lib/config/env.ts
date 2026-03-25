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

function parseProviderMode(
    value: string | undefined,
    fallback: ProviderMode
): ProviderMode {
    return value === "api" || value === "mock" ? value : fallback;
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

export const appEnv = {
    apiBaseUrl: normalizeUrl(
        apiTarget === "local" ? localApiBaseUrl : deployedApiBaseUrl
    ),
    apiTarget,
    deployedApiBaseUrl: normalizeUrl(deployedApiBaseUrl),
    localApiBaseUrl: normalizeUrl(localApiBaseUrl),
    authProvider: parseProviderMode(
        process.env.NEXT_PUBLIC_AUTH_PROVIDER,
        "mock"
    ),
    stockProvider: parseProviderMode(
        process.env.NEXT_PUBLIC_STOCK_PROVIDER,
        "api"
    ),
    sessionCookieName,
    csrfCookieName,
    csrfHeaderName,
} as const;

export type { ApiTarget, ProviderMode };
