type ProviderMode = "mock" | "api";

function parseProviderMode(
    value: string | undefined,
    fallback: ProviderMode
): ProviderMode {
    return value === "api" || value === "mock" ? value : fallback;
}

export const appEnv = {
    apiBaseUrl: (
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:3001"
    ).replace(/\/+$/, ""),
    authProvider: parseProviderMode(
        process.env.NEXT_PUBLIC_AUTH_PROVIDER,
        "mock"
    ),
    stockProvider: parseProviderMode(
        process.env.NEXT_PUBLIC_STOCK_PROVIDER,
        "api"
    ),
} as const;

export type { ProviderMode };
