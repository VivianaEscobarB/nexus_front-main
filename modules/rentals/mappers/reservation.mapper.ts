import type { ReservationResponseDTO } from "../types/reservation.dto";

export interface Reservation {
    id: number;
    clientName: string;
    token: string;
    status: number;
    startDate: string;
    endDate: string;
    expiresAt: string;
    units: string[];
}

export function mapReservationResponse(dto: ReservationResponseDTO): Reservation {
    return {
        id: dto.reservationId,
        clientName: dto.clientName,
        token: dto.reservationToken,
        status: dto.status,
        startDate: dto.startDate,
        endDate: dto.endDate,
        expiresAt: dto.expiresAt,
        units: dto.rentalUnits.map(u => u.displayName)
    };
}
