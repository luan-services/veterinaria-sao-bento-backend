import {prisma} from "../../lib/prisma.js";
import { z } from 'zod';
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsQuerySchema } from "./appointments.schema.js";
import { HTTPException } from "hono/http-exception";
import { APPOINTMENT_PER_USER_LIMIT, CANCEL_APPOINTMENT_TIME_LIMIT, SCHEDULE_MAXIMUM_DATE } from "../../config/config.js" /* constant */

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
type ListAppointmentsParamsInput = z.infer<typeof listAppointmentsQuerySchema>;

/* helper to get 1 hour time window based on date */
const getTimeWindow = (date: Date) => {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(end.getHours() + 1); // Adiciona 1 hora
    return { start, end };
};

/* admins can register more than one appointment per date */

/* MUST IMPLEMENT PAGINATION */

export const appointmentsService = {

    /* this service is exclusive to check the schedule map on frontend */
    async getSchedule(filters?: ListAppointmentsParamsInput) {

        const now = new Date();
        const threeMonthsLater = new Date(now);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + SCHEDULE_MAXIMUM_DATE);

        const queryStartDate = filters?.startDate ? new Date(filters.startDate) : now;
        const queryEndDate = filters?.endDate ? new Date(filters.endDate) : threeMonthsLater;

        return await prisma.appointment.findMany({
            where: {
                // Filtramos apenas status que ocupam a agenda (ignoramos cancelados e recusados)
                status: { not: "CANCELLED" }, 
                serviceType: filters?.serviceType,
                professionalId: filters?.professionalId,
                locationId: filters?.locationId,
                date: {
                    gte: queryStartDate,
                    lte: queryEndDate
                }
            },
            select: { /* using select, we get only needed to make the schedule */
                id: true,           
                date: true,           // Início
                endDate: true,        // Fim (Crucial para desenhar o bloco)
                status: true,         // Para mostrar se está confirmado ou pendente
                serviceType: true,    // Opcional: Para colorir o bloco na agenda (ex: Banho = Azul)
                professionalId: true, // Para saber em qual coluna colocar
                locationId: true      // Para saber de qual unidade é
                // userId, petId, notes, pet, user -> FICAM DE FORA
            },
            orderBy: { date: 'asc' }
        });
    },

    /* users can get their own appointmnents, we make sure we sent userid from the current session user, to avoid data leak */
    async listByUser(userId: string, filters?: ListAppointmentsParamsInput) {
        const dateClause:any = {};

        if (filters?.startDate || filters?.endDate) {
            dateClause.date = {};

            if (filters.startDate) {
                dateClause.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                dateClause.date.lte = new Date(filters.endDate);
            }
        }

        return await prisma.appointment.findMany({
            where: {
                userId: userId,
                status: filters?.status,
                serviceType: filters?.serviceType,
                professionalId: filters?.professionalId,
                locationId: filters?.locationId,
                ...dateClause
                
            },
            orderBy: { date: 'asc' }
        });
    },

    /* create service for users */
    /* this service allows not assigning profesisonals, if doing so, it'll check for an available professional, if there is none, 
        return error, if the user select a professional it'll check if that professional is available */
    async create(userId: string, data: CreateAppointmentInput) {

        const pet = await prisma.pet.findUnique({ 
            where: { 
                id: data.petId 
            } 
        });
        
        /* better to throw a generic error when the pet owner != userId to not let other users knows about pet existence */
        if (!pet || pet.ownerId !== userId) {
            throw new HTTPException(404, { message: "Pet not found" });
        };

        const start = new Date(data.date);
        const end = new Date(start.getTime() + data.duration * 60 * 1000);

        let finalProfessional = data.professionalId;

        /* checks if there is already an CONFIRMED appointment on the date (only if user selected a professional */
        if (finalProfessional && finalProfessional !== "") {
            const professionalConflict = await prisma.appointment.findFirst({
                where: {
                    professionalId: finalProfessional,
                    status: { not: "CANCELLED" },
                    AND: [
                        { date: { lt: end } },      // existing appointments starts before the new one ends
                        { endDate: { gt: start } }  //  existing appointments ends after the new one starts
                    ]
                }
            });

            if (professionalConflict) {
                throw new HTTPException(409, { message: "There is already an appointment for this professional in this schedule" });
            }
        } 
        else { /* if not, check for any available professional and assign */
            const busyProfessionals = await prisma.appointment.findMany({
                where: {
                    status: { not: "CANCELLED" },
                    AND: [
                        { date: { lt: end } },      // existing appointments starts before the new one ends
                        { endDate: { gt: start } }  //  existing appointments ends after the new one starts
                    ]
                },
                select: { professionalId: true } 
            });

            const busyIds = busyProfessionals
                .map(app => app.professionalId)
                .filter((id): id is string => id !== null);

            const availableProfessional = await prisma.professional.findFirst({
                where: {
                    id: { notIn: busyIds }, // 
                    specialty: data.serviceType === "BATH_GROOMING" ? "GROOMER" : "GENERAL_DOCTOR" /* guarantees the professional specialty matches the service type */
                }
            });

            if (!availableProfessional) {
                throw new HTTPException(409, { message: "There is no available professional in this schedule" });
            }

            finalProfessional = availableProfessional.id;
        }

        /* limit user appointments to 5 to avoid spam */
        const pendingCount = await prisma.appointment.count({
            where: { 
                userId: userId, 
                status: { not: "CANCELLED" },
            }
        });

        if (pendingCount >= APPOINTMENT_PER_USER_LIMIT) {
            throw new HTTPException(429, { message: "You have too many pending appointments. Please wait for confirmation or cancel some" });
        }

        /* checks if pet already have an appointment at the same time */
        const petConflict = await prisma.appointment.findFirst({
            where: {
                petId: data.petId,
                status: { not: "CANCELLED" },
                AND: [
                    { date: { lt: end } },      // existing appointments starts before the new one ends
                    { endDate: { gt: start } }  //  existing appointments ends after the new one starts
                ]
            }
        });

        if (petConflict) {
            throw new HTTPException(409, { message: "This pet already has an appointment at this time." });
        }

        return await prisma.appointment.create({
            data: {
                ...data,
                professionalId: finalProfessional,
                endDate: end,
                userId: userId,
                status: "PENDING"
            }
        });
    },

    /* cancel appointments if x hour has passed (admins can cancel anytime) */
    async cancel(appointmentId: string, userId: string, userRole: string) {

        const existingAppointment = await prisma.appointment.findUnique({
            where: { 
                id: appointmentId,
            }
        });

        if (!existingAppointment || (existingAppointment.userId !== userId && userRole !== "ADMIN")) {
            throw new HTTPException(404, { message: "Appointment not found" });
        }

        /* if user is not an admin, can only cancel it 24 hours before the appointment */
        if (userRole !== "ADMIN") {
            const appointmentDate = new Date(existingAppointment.date);
            const now = new Date();

            const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (diffInHours < CANCEL_APPOINTMENT_TIME_LIMIT) {
                throw new HTTPException(403, { 
                    message: `Appointments can only be cancelled at least ${CANCEL_APPOINTMENT_TIME_LIMIT} hours in advance.` 
                });
            }
        }

        /* verify if it is not already cancelled */
        if (existingAppointment.status === "COMPLETED" || existingAppointment.status === "CANCELLED") {
             throw new HTTPException(400, { message: "This appointment cannot be cancelled anymore" });
        }

        return await prisma.appointment.update({ 
            where: {
                id: appointmentId
            },
            data: {
                status: "CANCELLED"
            }
        });
    },

    async update(appointmentId: string, userRole:string, data: UpdateAppointmentInput) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to access this route" });
        }
        
        const existingAppointment = await prisma.appointment.findUnique({
            where: { 
                id: appointmentId
            }
        });

        /* there are two possible errors here, we need to throw them because prisma would only throw a generic not found error */
        if (!existingAppointment) {
            throw new HTTPException(404, { message: "Appointment not found" });
        }

        let start = undefined;
        let end = undefined;

        if (data.date) {
            start = data.date
            end = new Date(start.getTime() + data?.duration * 60 * 1000);
        }

        return await prisma.appointment.update({ 
            where: {
                id: appointmentId
            },
            data: {
                ...data,
                date: start,
                endDate: end
            }
        });
    },
    
    /* listing route for admin only */
    async listByFilter(userRole: string, userId: string, filters?: ListAppointmentsParamsInput) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(401, { message: "Unauthorized" });
        }

        const dateClause:any = {};

        if (filters?.startDate || filters?.endDate) {
            dateClause.date = {};

            if (filters.startDate) {
                dateClause.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                dateClause.date.lte = new Date(filters.endDate);
            }
        }

        return await prisma.appointment.findMany({
            where: {
                status: filters?.status,
                serviceType: filters?.serviceType,
                professionalId: filters?.professionalId,
                locationId: filters?.locationId,
                ...dateClause
                
            },
            orderBy: { date: 'asc' }
        });
    },

    /* only admins can delete appointments tables */
    async delete(appointmentId: string, userRole: string) {
        
        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "You are not allowed to access this route" });
        }
        
        const existingAppointment = await prisma.appointment.findUnique({
            where: { 
                id: appointmentId,
            }
        });

        /* there are two possible errors here, we need to throw them because prisma would only throw a generic not found error */
        if (!existingAppointment) {
            throw new HTTPException(404, { message: "Appointment not found" });
        }

        if (existingAppointment.status !== "CANCELLED") {
             throw new HTTPException(400, { message: "Only cancelled appointments can be deleted" });
        }

        return await prisma.appointment.delete({
            where: { 
                id: appointmentId 
            }
        });
    }
};