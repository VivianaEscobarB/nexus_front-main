import {
    createReservation as salesCreateReservation,
    type CreateReservationInput,
    type Reservation as SalesReservation,
    type ReservationStatus,
} from "@/modules/sales";
import type { CreateReservationRequestDTO } from "../types/reservation.dto";
import type { Reservation } from "../mappers/reservation.mapper";

function statusToNumeric(status: ReservationStatus): number {
    switch (status) {
        case "PENDING":
            return 1;
        case "APPROVED":
            return 2;
        case "REJECTED":
            return 3;
        case "CANCELLED":
            return 4;
        default:
            return 0;
    }
}

function toRentalsReservation(s: SalesReservation): Reservation {
    return {
        id: s.id,
        clientName: s.client?.businessName ?? "",
        token: s.reservationToken,
        status: statusToNumeric(s.status),
        startDate: s.startDate,
        endDate: s.endDate,
        expiresAt: s.expiresAt,
        units: s.units.map(u =>
            u.rentalUnit?.warehouse?.name ??
            u.rentalUnit?.displaySummary ??
            String(u.rentalUnitId)
        ),
    };
}

/**
 * Crea la reserva vía módulo de ventas (POST con DTO oficial: clientId, rentalUnitIds, startDate, endDate)
 * y adapta la respuesta al modelo del flujo rentals.
 */
export async function createReservation(payload: CreateReservationRequestDTO): Promise<Reservation> {
    const ids = payload.rentalUnitIds.filter(
        (id): id is number => id != null && Number.isFinite(id) && id > 0
    );

    if (ids.length === 0) {
        throw new Error("Debe incluirse al menos una rental unit válida (rentalUnitId > 0).");
    }

    const input: CreateReservationInput = {
        clientId: payload.clientId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        units: ids.map(rentalUnitId => ({ rentalUnitId })),
    };

    const salesRes = await salesCreateReservation(input);
    return toRentalsReservation(salesRes);
}
