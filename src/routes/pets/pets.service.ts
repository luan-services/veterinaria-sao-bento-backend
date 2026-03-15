import {prisma} from "../../lib/prisma.js";
import { z } from 'zod';
import { createPetSchema, updatePetSchema, listPetsQuerySchema } from "./pets.schema.js";
import { HTTPException } from "hono/http-exception";
import { PET_PER_USER_LIMIT } from "../../config/config.js";

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

    async listByUser(userId: string, userRole: string, filters?: ListPetsParamsInput) {
        return await prisma.pet.findMany({
            where: {
                ownerId: userId,
                species: filters?.species, 
                deletedAt: userRole === "USER" ? null : undefined, /* get only pets that were not deleted */

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
                ownerId: userId,
                deletedAt: null,
            }
        });
    },

    async create(userId: string, data: CreatePetInput) {
        const petCount = await prisma.pet.count({
            where: {
                ownerId: userId,
                deletedAt: null
            }
        });

        if (petCount >= PET_PER_USER_LIMIT) {
            throw new HTTPException(400, { message: "Maximun pet per user limit reached" });
        }

        return await prisma.pet.create({
            data: {
                ...data,
                ownerId: userId
            }
        });
    },

    async update(petId: string, userId: string, userRole: string, data: UpdatePetInput) {

        const existingPet = await prisma.pet.findUnique({
            where: { 
                id: petId 
            }
        });

        /* there are two possible errors here, we need to throw them because prisma would only throw a generic not found error */
        if (!existingPet) {
            throw new HTTPException(404, { message: "Pet not found" });
        }

        if (existingPet.ownerId !== userId) {
            throw new HTTPException(403, { message: "You are not allowed to update this pet" });
        }

        /* normal users cannot update deleted pets */
        if (existingPet.deletedAt !== null && userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to update this pet" });
        }

        return await prisma.pet.update({ 
            where: {
                id: petId
            },
            data: {
                ...data,
            }
        });
    },

    async delete(petId: string, userId: string, userRole: string) {
        
        const existingPet = await prisma.pet.findUnique({
            where: { 
                id: petId 
            }
        });

        /* there are two possible errors here, we need to throw them because prisma would only throw a generic not found error */
        if (!existingPet) {
            throw new HTTPException(404, { message: "Pet not found" });
        }

        const activeAppointments = await prisma.appointment.count({
            where: {
            petId: petId,
            status: {
                in: ['PENDING', 'CONFIRMED']
            }
            }
        });

        if (activeAppointments > 0) {
            throw new HTTPException(403, { message: "Cannot delete pet with upcoming appointments. Please cancel them first."});
        }

        if (existingPet.ownerId !== userId && userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to delete this pet" });
        }

        /* to check appointments data, it is better to keep, it is better to keep the pet data and just flag as deleted */
        return await prisma.pet.update({
            where: { id: petId },
            data: { 
                deletedAt: new Date()
            }
        });
        /*
        return await prisma.pet.delete({
            where: { 
                id: petId 
            }
        }); */
    }
};