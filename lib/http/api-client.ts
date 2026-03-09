import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";
import { appEnv } from "@/lib/config/env";
import {
    clearSessionStorage,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    TOKEN_KEY,
    REFRESH_TOKEN_KEY,
} from "@/lib/http/auth-session";

interface ApiErrorResponse {
    message: string;
    statusCode: number;
    error?: string;
}

const apiClient: AxiosInstance = axios.create({
    baseURL: appEnv.apiBaseUrl,
    timeout: 15_000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: string) => void;
    reject: (reason: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null): void {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
            return;
        }

        if (token) {
            promise.resolve(token);
        }
    });

    failedQueue = [];
}

apiClient.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest?._retry) {
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((newToken) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((refreshQueueError) =>
                        Promise.reject(refreshQueueError)
                    );
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                processQueue(error, null);
                isRefreshing = false;
                redirectToLogin();
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post<{ accessToken: string }>(
                    `${appEnv.apiBaseUrl}/auth/refresh`,
                    { refreshToken }
                );

                setAccessToken(data.accessToken);
                processQueue(null, data.accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                }

                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                clearSessionStorage();
                redirectToLogin();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status === 403) {
            console.error("[API] Acceso denegado:", error.response.data?.message);
        }

        if (error.response && error.response.status >= 500) {
            console.error(
                "[API] Error del servidor:",
                error.response.data?.message ?? "Error interno"
            );
        }

        return Promise.reject(error);
    }
);

function redirectToLogin(): void {
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
}

export { apiClient, TOKEN_KEY, REFRESH_TOKEN_KEY };
export type { ApiErrorResponse };
