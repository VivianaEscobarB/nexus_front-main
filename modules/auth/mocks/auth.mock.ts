import type {
    ActivateAccountRequest,
    ActivateAccountResponse,
    ForgotPasswordRequest,
    PasswordActionResponse,
    ResendActivationRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
} from "@/modules/auth/api/authTypes";
import { AccountActivationRequiredError } from "@/modules/auth/utils/loginError";
import type { LoginCredentials, User } from "@/types";

const MOCK_ROLE_KEY = "mock_user_role";
const MOCK_FIRST_NAME_KEY = "mock_user_fname";
const MOCK_LAST_NAME_KEY = "mock_user_lname";
const MOCK_EMAIL_KEY = "mock_user_email";

function persistMockUser(
    roleName: string,
    firstName: string,
    lastName: string,
    email: string
): void {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(MOCK_ROLE_KEY, roleName);
    window.localStorage.setItem(MOCK_FIRST_NAME_KEY, firstName);
    window.localStorage.setItem(MOCK_LAST_NAME_KEY, lastName);
    window.localStorage.setItem(MOCK_EMAIL_KEY, email);
}

export function hasMockSessionState(): boolean {
    if (typeof window === "undefined") return false;

    return Boolean(window.localStorage.getItem(MOCK_EMAIL_KEY));
}

export async function login(
    credentials: LoginCredentials
): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const emailLower = credentials.email.toLowerCase();

    if (
        emailLower.includes("inactive") ||
        emailLower.includes("pendiente") ||
        emailLower.includes("activate")
    ) {
        throw new AccountActivationRequiredError();
    }

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

    const mockUser: User = {
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
    };

    persistMockUser(roleName, firstName, lastName, credentials.email);

    return mockUser;
}

export async function logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
}

export function clearMockSessionState(): void {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(MOCK_ROLE_KEY);
    window.localStorage.removeItem(MOCK_FIRST_NAME_KEY);
    window.localStorage.removeItem(MOCK_LAST_NAME_KEY);
    window.localStorage.removeItem(MOCK_EMAIL_KEY);
}

export async function getMe(): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!hasMockSessionState()) {
        throw new Error("No hay una sesion mock activa.");
    }

    let roleName = "ADMIN";
    let firstName = "Administrador";
    let lastName = "General (Recarga)";
    let email = "admin@empresa.com";

    if (typeof window !== "undefined") {
        roleName = window.localStorage.getItem(MOCK_ROLE_KEY) || "ADMIN";
        if (roleName === "MANAGER") {
            roleName = "ADMIN";
        }
        firstName = window.localStorage.getItem(MOCK_FIRST_NAME_KEY) || "Usuario";
        lastName =
            window.localStorage.getItem(MOCK_LAST_NAME_KEY) ||
            "Demo (Recarga)";
        email =
            window.localStorage.getItem(MOCK_EMAIL_KEY) ||
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

export async function resendActivation(
    payload: ResendActivationRequest
): Promise<PasswordActionResponse> {
    void payload;
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
        message: "Solicitud simulada de activacion enviada.",
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

export async function activateAccount(
    payload: ActivateAccountRequest
): Promise<ActivateAccountResponse> {
    void payload;
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
        message: "Cuenta simulada activada.",
    };
}
