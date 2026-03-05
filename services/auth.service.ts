import { apiClient } from "@/lib/axios";
import type {
    LoginCredentials,
    AuthSession,
    User,
} from "@/types";

// ---------------------------------------------------------------------------
// Auth Service
// Gestiona todas las peticiones HTTP relacionadas con autenticación.
// Ningún componente debe llamar a apiClient / axios directamente.
// ---------------------------------------------------------------------------

import { UserRole } from "@/types";

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
    // --- INICIO DE MOCK PARA DESARROLLO FRONTEND ---
    // Simular un retraso de red
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generar un JWT falso con expiración lejana para que proxy.ts lo acepte ({"exp": 9999999999} = eyJleHAiOjk5OTk5OTk5OTl9)
    const fakeToken = "mockHeader.eyJleHAiOjk5OTk5OTk5OTl9.mockSignature";

    // Determinar el rol basado en el texto del email
    const emailLower = credentials.email.toLowerCase();
    let roleName = "OPERATOR";
    let roleId = "rol_02";
    let firstName = "Empleado";
    let lastName = "Operativo";

    if (emailLower.includes("admin")) {
        roleName = "ADMIN"; roleId = "rol_01"; firstName = "Administrador"; lastName = "General";
    } else if (emailLower.includes("supervisor")) {
        roleName = "SUPERVISOR"; roleId = "rol_03"; firstName = "Supervisor"; lastName = "Bodega";
    } else if (emailLower.includes("sales") || emailLower.includes("venta")) {
        roleName = "SALES_AGENT"; roleId = "rol_04"; firstName = "Agente"; lastName = "De Ventas";
    } else if (emailLower.includes("client") || emailLower.includes("cliente")) {
        roleName = "CLIENT"; roleId = "rol_05"; firstName = "Cliente"; lastName = "VIP";
    }

    const mockSession: AuthSession = {
        tokens: {
            accessToken: fakeToken,
            refreshToken: "fake_refresh_token",
        },
        user: {
            user_id: `usr_${roleName.toLowerCase()}`,
            first_name: firstName,
            last_name: lastName,
            email: credentials.email,
            status: "ACTIVE",
            roles: [{
                role_id: roleId,
                role_name: roleName,
                role_description: null
            }],
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        }
    };

    // Solo como soporte al mock para un reencendido por getMe():
    if (typeof window !== "undefined") {
        window.localStorage.setItem("mock_user_role", roleName);
        window.localStorage.setItem("mock_user_fname", firstName);
        window.localStorage.setItem("mock_user_lname", lastName);
        window.localStorage.setItem("mock_user_email", credentials.email);
    }

    return mockSession;
    // --- FIN DE MOCK ---

    // const { data } = await apiClient.post<AuthSession>("/auth/login", credentials);
    // return data;
}

/**
 * Cierra la sesión en el backend (invalida el refresh token).
 * También debe limpiar las cookies / localStorage en el hook que lo consuma.
 */
export async function logout(): Promise<void> {
    // --- MOCK ---
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
    // await apiClient.post<void>("/auth/logout");
}

/**
 * Solicita un nuevo access token usando el refresh token almacenado.
 * El interceptor de axios.ts llama a este endpoint automáticamente en 401,
 * pero puede invocarse de forma explícita si se necesita.
 */
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    const { data } = await apiClient.post<{ accessToken: string }>("/auth/refresh", {
        refreshToken,
    });
    return data;
}

/**
 * Obtiene el perfil del usuario autenticado en ese momento.
 * Útil para rehidratar la sesión al recargar la app.
 */
export async function getMe(): Promise<User> {
    // --- MOCK ---
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Recuperar el rol de la sesión mock
    let rName = "ADMIN";
    let fName = "Administrador";
    let lName = "General (Recarga)";
    let mail = "admin@empresa.com";

    if (typeof window !== "undefined") {
        rName = window.localStorage.getItem("mock_user_role") || "ADMIN";
        fName = window.localStorage.getItem("mock_user_fname") || "Usuario";
        lName = window.localStorage.getItem("mock_user_lname") || "Demo (Recarga)";
        mail = window.localStorage.getItem("mock_user_email") || "demo@empresa.com";
    }

    // Suponemos que si llegó aquí es porque tiene un fakeToken
    return {
        user_id: `usr_${rName.toLowerCase()}_mock`,
        email: mail,
        first_name: fName,
        last_name: lName,
        status: "ACTIVE",
        roles: [{
            role_id: "rol_mock",
            role_name: rName,
            role_description: null
        }],
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    };
    // const { data } = await apiClient.get<User>("/auth/me");
    // return data;
}
