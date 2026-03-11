import { StatCard } from "@/components/ui";

interface TotalsHeaderProps {
    totals: {
        warehouses: number;
        sectors: number;
        spaces: number;
        occupiedSpaces: number;
    };
}

export function TotalsHeader({ totals }: TotalsHeaderProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                title="Bodegas"
                value={totals.warehouses}
                description="Instalaciones registradas"
            />
            <StatCard
                title="Sectores"
                value={totals.sectors}
                description="Divisiones internas activas"
            />
            <StatCard
                title="Espacios"
                value={totals.spaces}
                description="Ubicaciones administradas"
            />
            <StatCard
                title="Espacios ocupados"
                value={totals.occupiedSpaces}
                description="Ocupados o reservados"
            />
        </div>
    );
}
