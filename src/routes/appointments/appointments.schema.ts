import { z } from "zod";

export const createAppointmentSchema = z.object({
    date: z.date()
        .refine((date) => date > new Date(), { message: "Appointments cannot happen in the past" }),
    serviceType: z.enum(["CONSULTATION", "VACCINATION", "EXAM", "CHECKUP", "BATH_GROOMING"]),
    notes: z.string()
        .max(500)
        .optional(),
    petId: z.string()
        .max(50, "Pet ID is expected to have less than 50 characters"),
    professionalId: z.string()
        .max(50, "Professional ID is expected to have less than 50 characters")
        .optional(),
    locationId: z.string()
        .max(50, "Location ID is expected to have less than 50 characters")
        .optional(),
});

/* only for admin */
export const updateAppointmentSchema = z.object({
    date: z.date().optional(),
    serviceType: z.enum(["CONSULTATION", "VACCINATION", "EXAM", "CHECKUP", "BATH_GROOMING"])
        .optional(),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"])
        .optional(),
    notes: z.string()
        .max(500)
        .optional(),
    professionalId: z.string()
        .max(50, "Professional ID is expected to have less than 50 characters")
        .optional(),
    locationId: z.string()
        .max(50, "Location ID is expected to have less than 50 characters")
        .optional(),
});

export const listAppointmentsQuerySchema = z.object({
    startDate: z.date()
        .optional(),
    endDate: z.date()
        .optional(),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
    professionalId: z.string().optional(),
});