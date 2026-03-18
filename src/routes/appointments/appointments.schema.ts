import { z } from "zod";

export const createAppointmentSchema = z.object({
    date: z.coerce.date()
        .refine((date) => date > new Date(), { message: "Appointments cannot happen in the past" }),
    serviceType: z.enum(["CONSULTATION", "VACCINATION", "EXAM", "CHECKUP", "BATH_GROOMING"]),
    notes: z.string()
        .max(500)
        .optional(),
    petId: z.string()
        .max(50, "Pet ID is expected to have less than 50 characters"),
    professionalId: z.string()
        .max(50, "Professional ID is expected to have less than 50 characters")
        .optional()
});

/* only for admin */
export const updateAppointmentSchema = z.object({
    date: z.coerce.date()
        .optional(),
    serviceType: z.enum(["CONSULTATION", "VACCINATION", "EXAM", "CHECKUP", "BATH_GROOMING"])
        .optional(),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
        .optional(),
    notes: z.string()
        .max(500)
        .optional(),
    professionalId: z.string()
        .max(50, "Professional ID is expected to have less than 50 characters")
        .optional()
});

export const listAppointmentsQuerySchema = z.object({
    startDate: z.coerce.date()
        .optional(),
    endDate: z.coerce.date()
        .optional(),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
        .optional(),
    serviceType: z.enum(["CONSULTATION", "VACCINATION", "EXAM", "CHECKUP", "BATH_GROOMING"])
        .optional(),
    professionalId: z.string()
        .max(50, "Professional ID is expected to have less than 50 characters")
        .optional()
});