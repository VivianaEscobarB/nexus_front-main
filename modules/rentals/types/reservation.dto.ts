/** El servicio convierte `rentalUnitIds` al cuerpo del API: `units: [{ rentalUnitId }]`. */
export interface CreateReservationRequestDTO {
    clientId: number;
    rentalUnitIds: number[];
    startDate: string;
    endDate: string;
}

export interface ReservationRentalUnitDTO {
    rentalUnitId: number;
    entityTypeId: number;
    entityTypeName: string;
    referenceType: string;
    referenceId: number;
    referenceCode: string;
    referenceName: string | null;
    displayName: string;
}

export interface ReservationResponseDTO {
    reservationId: number;
    clientId: number;
    clientName: string;
    reservationToken: string;
    status: number;
    startDate: string;
    endDate: string;
    expiresAt: string;
    createdAt: string;
    rentalUnits: ReservationRentalUnitDTO[];
}
