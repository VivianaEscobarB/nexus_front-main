"use client";

import React, { useState } from "react";
import { Card, CardBody, Input, Button } from "@/components/ui";

export type RentalAvailabilitySearchProps = {
    onSearch: (startDate: string, endDate: string) => void;
};

export function RentalAvailabilitySearch({ onSearch }: RentalAvailabilitySearchProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    const isValid = startDate !== "" && endDate !== "" && new Date(startDate) <= new Date(endDate);

    const handleSearch = () => {
        if (isValid) {
            onSearch(startDate, endDate);
        }
    };

    return (
        <Card className="border-l-4 border-l-[var(--color-primary-default)]">
            <CardBody className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Input
                            type="date"
                            label="Fecha de Inicio"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <Input
                            type="date"
                            label="Fecha de Fin"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-none">
                        <Button
                            variant="primary"
                            onClick={handleSearch}
                            disabled={!isValid}
                        >
                            Consultar Disponibilidad
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
