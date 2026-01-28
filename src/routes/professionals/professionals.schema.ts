import { z } from "zod";

export const createProfessionalSchema = z.object({
    name: z.string()
        .min(1, "Professional name can't be blank")
        .max(120, "Professional name is expected to have less than 120 characters"),
    specialty: z.string()
        .min(1, "Specialty can't be blank")
        .max(60, "Specialty is expected to have less than 60 characters"),
    active: z.boolean()
        .default(true),
});

export const updateProfessionalSchema = createProfessionalSchema.partial();

/* no need to professional query filter validation here because professional is not supposed to receive lots of tables */