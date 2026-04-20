export type BusinessProcess =
    | "authentication"
    | "warehouseStructure"
    | "userManagement"
    | "clientManagement"
    | "inventory"
    | "movements"
    | "contracts";

export const businessProcessVisibility: Record<BusinessProcess, boolean> = {
    authentication: true,
    warehouseStructure: true,
    userManagement: true,
    clientManagement: true,
    inventory: false,
    movements: false,
    contracts: true,
};

export function isBusinessProcessVisible(process: BusinessProcess): boolean {
    return businessProcessVisibility[process];
}
