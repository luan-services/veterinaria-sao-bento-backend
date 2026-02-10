import { prisma } from "../../lib/prisma.js";
import { z } from 'zod';
import { createPetSchema, updatePetSchema, listPetsQuerySchema } from "./pets.schema.js";
import { HTTPException } from "hono/http-exception";
/* MUST IMPLEMENT PAGINATION */
export const petsService = {
    async listByFilter(filters) {
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
    async listByUser(userId, filters) {
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
    async getById(petId, userId) {
        return await prisma.pet.findFirst({
            where: {
                id: petId,
                ownerId: userId
            }
        });
    },
    async create(userId, data) {
        return await prisma.pet.create({
            data: {
                ...data,
                ownerId: userId
            }
        });
    },
    async update(petId, userId, data) {
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
        return await prisma.pet.update({
            where: {
                id: petId
            },
            data: {
                ...data,
            }
        });
    },
    async delete(petId, userId, userRole) {
        const existingPet = await prisma.pet.findUnique({
            where: {
                id: petId
            }
        });
        /* there are two possible errors here, we need to throw them because prisma would only throw a generic not found error */
        if (!existingPet) {
            throw new HTTPException(404, { message: "Pet not found" });
        }
        if (existingPet.ownerId !== userId && userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to delete this pet" });
        }
        return await prisma.pet.delete({
            where: {
                id: petId
            }
        });
    }
};
