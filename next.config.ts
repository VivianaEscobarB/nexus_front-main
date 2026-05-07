import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    turbopack: {
        root: process.cwd(),
    },
    async redirects() {
        return [
            {
                source: "/dashboard/supervisor/recepcion-mercancia",
                destination: "/dashboard/operador/recepcion-mercancia",
                permanent: false,
            },
            {
                source: "/dashboard/supervisor/movimientos-inventario",
                destination: "/dashboard/operador/movimientos-inventario",
                permanent: false,
            },
            {
                source: "/dashboard/supervisor/consulta-inventario",
                destination: "/dashboard/consulta-inventario",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
