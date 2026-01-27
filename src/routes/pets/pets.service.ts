import {prisma} from "../../lib/prisma.js";
import { z } from 'zod';
import { createPetSchema, updatePetSchema, listPetsQuerySchema } from "./pets.schema.js";

type CreatePetInput = z.infer<typeof createPetSchema>;
type UpdatePetInput = z.infer<typeof updatePetSchema>;
type ListPetsParamsInput = z.infer<typeof listPetsQuerySchema>;

/* MUST IMPLEMENT PAGINATION */

export const petsService = {

    async listByFilter(filters?: ListPetsParamsInput) {
        return await prisma.pet.findMany({
            where: {
                ownerId: filters?.userId, 
                species: filters?.species, 

                /* parcial and case-insensitive search */
                name: filters?.name ? {
                    contains: filters.name,
                    mode: 'insensitive'
                } : undefined,
                
                /* parcial and case-insensitive search */
                breed: filters?.breed ? {
                    contains: filters.breed,
                    mode: 'insensitive'
                } : undefined
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async listByUser(userId: string, filters?: ListPetsParamsInput) {
        return await prisma.pet.findMany({
            where: {
                ownerId: userId,
                species: filters?.species, 

                /* parcial and case-insensitive search */
                name: filters?.name ? {
                    contains: filters.name,
                    mode: 'insensitive'
                } : undefined,
                
                /* parcial and case-insensitive search */
                breed: filters?.breed ? {
                    contains: filters.breed,
                    mode: 'insensitive'
                } : undefined
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async getById(petId: string, userId: string) {
        return await prisma.pet.findFirst({
            where: { 
                id: petId, 
                ownerId: userId 
            }
        });
    },

    async create(userId: string, data: CreatePetInput) {
        return await prisma.pet.create({
            data: {
                ...data,
                ownerId: userId
            }
        });
    },

    async update(petId: string, userId: string, data: UpdatePetInput) {
        return await prisma.pet.update({ 
            where: {
                id: petId
            },
            data: {
                ...data,
                /* ownerId: userId -> optional, add only if changing owner is acceptable */
            }
        });
    },

    async delete(petId: string, userId: string) {
        // Primeiro verifica se o pet existe e é do dono
        const pet = await prisma.pet.findFirst({
            where: { id: petId, ownerId: userId }
        });

        if (!pet) return null;

        return await prisma.pet.delete({
            where: { id: petId }
        });
    }
};