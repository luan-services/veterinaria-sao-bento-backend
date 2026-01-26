import { z } from "zod";

export const createPetSchema = z.object({
    name: z.string().min(1, "Name can't be blank"),
    species: z.enum(["DOG", "CAT"]),
    breed: z.string().optional(),
    birthDate: z.date().optional(),
    photoUrl: z.url().optional(),
});

export const updatePetSchema = createPetSchema.partial();