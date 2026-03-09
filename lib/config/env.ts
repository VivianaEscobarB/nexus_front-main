type ProviderMode = "mock" | "api";
type ApiTarget = "deployed" | "local";

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
} as const;

export type { ApiTarget, ProviderMode };
