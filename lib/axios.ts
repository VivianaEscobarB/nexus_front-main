import axios, {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
} from "axios";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "nexus_access_token";
const REFRESH_TOKEN_KEY = "nexus_refresh_token";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface ApiErrorResponse {
    message: string;
    statusCode: number;
    error?: string;
}

// ---------------------------------------------------------------------------
// Instancia principal de Axios
// ---------------------------------------------------------------------------
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15_000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// ---------------------------------------------------------------------------
// Interceptor de REQUEST — adjunta el JWT a cada petición saliente
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // En el browser, leemos el token del localStorage.
        // En SSR / middleware de Next.js no hay window, por lo que lo omitimos.
        if (typeof window !== "undefined") {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Interceptor de RESPONSE — manejo global de errores y refresco de token
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: string) => void;
    reject: (reason: unknown) => void;
}> = [];

/** Procesa las peticiones en cola una vez que se renueva el token. */
function processQueue(error: AxiosError | null, token: string | null): void {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else if (token) {
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

        // --- 401: Token expirado → intentar refresh ---
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Encolar la petición mientras se refresca el token
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((newToken) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken =
                typeof window !== "undefined"
                    ? localStorage.getItem(REFRESH_TOKEN_KEY)
                    : null;

            if (!refreshToken) {
                processQueue(error, null);
                isRefreshing = false;
                redirectToLogin();
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post<{ accessToken: string }>(
                    `${API_BASE_URL}/auth/refresh`,
                    { refreshToken }
                );

                const newToken = data.accessToken;
                localStorage.setItem(TOKEN_KEY, newToken);
                processQueue(null, newToken);
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                clearSession();
                redirectToLogin();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // --- 403: Sin permisos ---
        if (error.response?.status === 403) {
            console.error("[API] Acceso denegado:", error.response.data?.message);
        }

        // --- 500+: Error del servidor ---
        if (error.response && error.response.status >= 500) {
            console.error(
                "[API] Error del servidor:",
                error.response.data?.message ?? "Error interno"
            );
        }

        return Promise.reject(error);
    }
);

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------
function clearSession(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
}

function redirectToLogin(): void {
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { apiClient, TOKEN_KEY, REFRESH_TOKEN_KEY };
export type { ApiErrorResponse };
