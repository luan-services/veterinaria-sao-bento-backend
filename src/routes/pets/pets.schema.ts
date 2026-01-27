import { z } from "zod";

export const createPetSchema = z.object({
    name: z.string()
        .min(1, "Pet name can't be blank")
        .max(60, "Pet name is expected to have less than 60 characters"),
    species: z.enum(["DOG", "CAT"]),
    breed: z.string()
        .max(60, "Breed name is expected to have less than 60 characters")
        .optional(),
    birthDate: z.date().optional(),
    photoUrl: z.url()
        .max(200, "URL is expected to have less than 60 characters")
        .optional(),
});

export const updatePetSchema = createPetSchema.partial();

export const listPetsQuerySchema = z.object({
    name: z.string()
        .max(60, "Pet name is expected to have less than 60 characters")
        .optional(),
    species: z.enum(["DOG", "CAT"])
        .optional(),
    breed: z.string()
        .max(60, "Breed name is expected to have less than 60 characters")
        .optional(),
    /* this is a filter allowed only for admins, users might send but it'll be overwritten */
    userId: z.string()
        .max(50, "User ID is expected to have less than 50 characters")
        .optional(),
});