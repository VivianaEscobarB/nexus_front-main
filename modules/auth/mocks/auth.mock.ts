import type {
    ForgotPasswordRequest,
    PasswordActionResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import type { AuthSession, LoginCredentials, User } from "@/types";

function persistMockUser(
    roleName: string,
    firstName: string,
    lastName: string,
    email: string
): void {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("mock_user_role", roleName);
    window.localStorage.setItem("mock_user_fname", firstName);
    window.localStorage.setItem("mock_user_lname", lastName);
    window.localStorage.setItem("mock_user_email", email);
}

export async function login(
    credentials: LoginCredentials
): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const fakeToken = "mockHeader.eyJleHAiOjk5OTk5OTk5OTl9.mockSignature";

    const emailLower = credentials.email.toLowerCase();
    let roleName = "WAREHOUSE_OPERATOR";
    let roleId = "rol_04";
    let firstName = "Empleado";
    let lastName = "Operativo";

    if (emailLower.includes("admin")) {
        roleName = "ADMIN";
        roleId = "rol_01";
        firstName = "Administrador";
        lastName = "General";
    } else if (emailLower.includes("manager") || emailLower.includes("gerencia")) {
        roleName = "ADMIN";
        roleId = "rol_01";
        firstName = "Administrador";
        lastName = "General";
    } else if (emailLower.includes("supervisor")) {
        roleName = "WAREHOUSE_SUPERVISOR";
        roleId = "rol_03";
        firstName = "Supervisor";
        lastName = "Bodega";
    } else if (emailLower.includes("sales") || emailLower.includes("venta")) {
        roleName = "SALES_AGENT";
        roleId = "rol_05";
        firstName = "Agente";
        lastName = "De Ventas";
    } else if (
        emailLower.includes("client") ||
        emailLower.includes("cliente")
    ) {
        roleName = "CLIENT";
        roleId = "rol_06";
        firstName = "Cliente";
        lastName = "VIP";
    }

    const mockSession: AuthSession = {
        userId: `usr_${roleName.toLowerCase()}`,
        username: `${firstName} ${lastName}`.trim(),
        roles: [roleName],
        permissions: [],
        token: fakeToken,
        refreshToken: "fake_refresh_token",
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
            roles: [
                {
                    role_id: roleId,
                    role_name: roleName,
                    role_description: null,
                },
            ],
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        },
    };

    persistMockUser(roleName, firstName, lastName, credentials.email);

    return mockSession;
}

export async function logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
}

export function clearMockSessionState(): void {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem("mock_user_role");
    window.localStorage.removeItem("mock_user_fname");
    window.localStorage.removeItem("mock_user_lname");
    window.localStorage.removeItem("mock_user_email");
}

export async function getMe(): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let roleName = "ADMIN";
    let firstName = "Administrador";
    let lastName = "General (Recarga)";
    let email = "admin@empresa.com";

    if (typeof window !== "undefined") {
        roleName = window.localStorage.getItem("mock_user_role") || "ADMIN";
        if (roleName === "MANAGER") {
            roleName = "ADMIN";
        }
        firstName = window.localStorage.getItem("mock_user_fname") || "Usuario";
        lastName =
            window.localStorage.getItem("mock_user_lname") ||
            "Demo (Recarga)";
        email =
            window.localStorage.getItem("mock_user_email") ||
            "demo@empresa.com";
    }

    return {
        user_id: `usr_${roleName.toLowerCase()}_mock`,
        email,
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        roles: [
            {
                role_id: "rol_mock",
                role_name: roleName,
                role_description: null,
            },
        ],
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    };
}

export async function register(
    payload: RegisterRequest
): Promise<RegisterResponse> {
    await new Promise((resolve) => setTimeout(resolve, 900));

    persistMockUser("CLIENT", payload.username, "", payload.email);

    return {
        message: "Registro simulado completado.",
    };
}

export async function forgotPassword(
    payload: ForgotPasswordRequest
): Promise<PasswordActionResponse> {
    void payload;
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
        message: "Solicitud simulada de recuperacion enviada.",
    };
}

export async function resetPassword(
    payload: ResetPasswordRequest
): Promise<PasswordActionResponse> {
    void payload;
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
        message: "Contrasena simulada actualizada.",
    };
}
