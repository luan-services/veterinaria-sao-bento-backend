import { prisma } from "../../lib/prisma.js";
import { z } from 'zod';
import { createProfessionalSchema, updateProfessionalSchema } from "./professionals.schema.js";
import { HTTPException } from "hono/http-exception";

type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;

export const professionalsService = {

    /* no need to filters here, just a simple get, location is not supposed to receive lots of tables */

    async listAll() {
        return await prisma.professional.findMany();
    },

    async create(userRole: string, data: CreateProfessionalInput) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to create Professionals" });
        }

        return await prisma.professional.create({
            data: {
                ...data,
            }
        });
    },

    async update(userRole: string, professionalId: string, data: UpdateProfessionalInput) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to update Professionals" });
        }

        /* no need to check professional existence here because prisma will throw an error if it does not exist, and our
        errorhandler will pass it, AND we don't need to know if professional belongs to anyone */

        return await prisma.professional.update({ 
            where: {
                id: professionalId
            },
            data: {
                ...data,
            }
        });
    },

    async delete(userRole: string, professionalId: string) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to delete Professionals" });
        }
        
        /* no need to check location existence here because prisma will throw an error if it does not exist, and our
        errorhandler will pass it, AND we don't need to know if location belongs to anyone */
        
        return await prisma.professional.delete({
            where: { 
                id: professionalId
            }
        });
    }
};