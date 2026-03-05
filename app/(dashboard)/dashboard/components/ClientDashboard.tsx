"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

function PackageIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>; }
function CurrencyDollarIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>; }
function SearchIcon() { return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>; }

const MOCK_INVENTORY = [
    { sku: "SKU-A10", name: "Notebook X", qty: 450, sector: "Bodega 1 - Pasillo A" },
    { sku: "SKU-B12", name: "Tablet Z", qty: 23, sector: "Bodega 1 - Pasillo A" },
    { sku: "SKU-C14", name: "Monitor 24'", qty: 0, sector: "Bodega Extra" },
];

export function ClientDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Portal de Cliente
                    </h1>
                    <p className="mt-1 text-lg" style={{ color: "var(--color-text-tertiary)" }}>
                        ¡Bienvenido de vuelta, {user?.first_name || "Cliente"}! Aquí está el resumen de tu almacenamiento.
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl flex items-center gap-4" style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand-strong)" }}>
                    <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center">
                        <PackageIcon />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold opacity-90">Total Productos Almacenados</h3>
                        <p className="text-3xl font-extrabold mt-1">473</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl flex items-center gap-4 border" style={{ background: "var(--color-surface-base)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center" style={{ color: "var(--color-success-strong)" }}>
                        <CurrencyDollarIcon />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Estado de Cuenta Mensual</h3>
                        <p className="text-xl font-bold mt-1" style={{ color: "var(--color-text-primary)" }}>Al día <span className="text-sm font-normal text-text-tertiary ml-2">(Próximo corte: día 30)</span></p>
                    </div>
                </div>
            </div>

            {/* Inventario Cliente */}
            <section className="rounded-2xl border bg-surface-base overflow-hidden" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Mi Inventario</h2>
                    <div className="flex items-center gap-2 relative">
                        <input
                            type="text"
                            placeholder="Buscar SKU o nombre..."
                            className="bg-surface-hover border border-border-default rounded-md px-3 py-1.5 text-sm pl-9"
                        />
                        <div className="absolute left-3 top-1.5 text-text-tertiary">
                            <SearchIcon />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b text-xs uppercase" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)", background: "var(--color-surface-hover)" }}>
                                <th className="font-semibold p-4 text-left">SKU</th>
                                <th className="font-semibold p-4 text-left">Producto</th>
                                <th className="font-semibold p-4 text-right">Cant. Actual</th>
                                <th className="font-semibold p-4 text-left">Ubicación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_INVENTORY.map((item) => (
                                <tr key={item.sku} className="border-b last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors text-sm" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
                                    <td className="p-4 font-mono text-xs">{item.sku}</td>
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 text-right font-mono font-medium">
                                        {item.qty === 0 ? (
                                            <span className="text-danger-strong bg-danger-subtle px-2 py-0.5 rounded text-xs">Sin Stock</span>
                                        ) : (
                                            item.qty
                                        )}
                                    </td>
                                    <td className="p-4" style={{ color: "var(--color-text-secondary)" }}>{item.sector}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
