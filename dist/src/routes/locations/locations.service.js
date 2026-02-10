import { prisma } from "../../lib/prisma.js";
import { z } from 'zod';
import { createLocationSchema, updateLocationSchema } from "./locations.schema.js";
import { HTTPException } from "hono/http-exception";
export const locationsService = {
    /* no need to filters here, just a simple get, location is not supposed to receive lots of tables */
    async listAll() {
        return await prisma.location.findMany();
    },
    async create(userRole, data) {
        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to create Locations" });
        }
        return await prisma.location.create({
            data: {
                ...data,
            }
        });
    },
    async update(userRole, locationId, data) {
        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to update Locations" });
        }
        /* no need to check location existence here because prisma will throw an error if it does not exist, and our
        errorhandler will pass it, AND we don't need to know if location belongs to anyone */
        return await prisma.location.update({
            where: {
                id: locationId
            },
            data: {
                ...data,
            }
        });
    },
    async delete(userRole, locationId) {
        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to delete Locations" });
        }
        /* no need to check location existence here because prisma will throw an error if it does not exist, and our
        errorhandler will pass it, AND we don't need to know if location belongs to anyone */
        return await prisma.location.delete({
            where: {
                id: locationId
            }
        });
    }
};
