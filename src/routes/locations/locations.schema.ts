import { z } from "zod";

export const createLocationSchema = z.object({
    name: z.string()
        .min(1, "Location name can't be blank")
        .max(120, "Location name is expected to have less than 120 characters"),
    city: z.string()
        .min(1, "City can't be blank")
        .max(120, "City is expected to have less than 120 characters"),
    address: z.string()
        .min(1, "Address can't be blank")
        .max(200, "Address is expected to have less than 200 characters"),
    zipCode: z.string()
        .regex(/^\d{5}-?\d{3}$/, { message: "Invalid CEP. Use format 00000-000 or 00000000." })
        .transform((cep) => cep.replace("-", ""))
});

export const updateLocationSchema = createLocationSchema.partial();

/* no need to location query filter validation here because location is not supposed to receive lots of tables */