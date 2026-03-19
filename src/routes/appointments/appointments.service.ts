import {prisma} from "../../lib/prisma.js";
import { z } from 'zod';
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsQuerySchema } from "./appointments.schema.js";
import { HTTPException } from "hono/http-exception";
import { APPOINTMENT_PER_USER_LIMIT, CANCEL_APPOINTMENT_TIME_LIMIT, SCHEDULE_MAXIMUM_DATE, SERVICE_DURATION } from "../../config/config.js" /* constant */

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
type ListAppointmentsParamsInput = z.infer<typeof listAppointmentsQuerySchema>;

/* admins can register more than one appointment per date */

/* MUST IMPLEMENT PAGINATION */

export const appointmentsService = {

    /*
        general user services 
    */

    /* this service is exclusive to check the schedule map on frontend */
    async getSchedule(filters?: ListAppointmentsParamsInput) {

        const now = new Date();
        const maximumDate = new Date(now);
        maximumDate.setMonth(maximumDate.getMonth() + SCHEDULE_MAXIMUM_DATE);

        const queryStartDate = filters?.startDate ? new Date(filters.startDate) : now;
        const queryEndDate = filters?.endDate ? new Date(filters.endDate) : maximumDate;

        return await prisma.appointment.findMany({
            where: {
                status: { not: "CANCELLED" }, 
                serviceType: filters?.serviceType,
                professionalId: filters?.professionalId,
                date: {
                    gte: queryStartDate,
                    lte: queryEndDate
                }
            },
            select: { /* using select, we get only needed to make the schedule */
                id: true,           
                date: true,         
                endDate: true,      
                status: true,        
                serviceType: true,   
                professionalId: true,  
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
                ...dateClause
                
            },
            include: {
                pet: {
                    select: {
                        name: true
                    }
                }
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

        const duration = SERVICE_DURATION[data.serviceType];

        const start = new Date(data.date);
        const end = new Date(start.getTime() + duration * 60 * 1000);

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

        /* constraint to check if professional specialty matches service type */
        if (data.professionalId) {
            const professional = await prisma.professional.findUnique({
                where: { id: data.professionalId }
            });

            if (!professional) {
                throw new HTTPException(404, { message: "Professional not found" });
            }

            const service = data.serviceType;

            if ( professional.specialty === "BATH_GROOMING" && service !== "BATH_GROOMING" ) {
                throw new HTTPException(400, {
                    message: "This professional only performs bath and grooming services."
                });
            }

            if ( professional.specialty === "GENERAL_DOCTOR" && service === "BATH_GROOMING" ) {
                throw new HTTPException(400, {
                    message: "This professional cannot perform bath and grooming services."
                });
            }
        }

        return await prisma.appointment.create({
            data: {
                ...data,
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
                    message: `Appointments can only be cancelled at least ${CANCEL_APPOINTMENT_TIME_LIMIT} hours in advance` 
                });
            }
            
            /* commom users cannot cancel a already confirmed appointment */
            if (existingAppointment.status === "CONFIRMED") {
                throw new HTTPException(400, { message: "This appointment is already confirmed. Contact the clinic to cancel it" });
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

    /*
        admin only services
    */

    async listByFilter(userRole: string, userId: string, filters?: ListAppointmentsParamsInput) {

        if (userRole !== "ADMIN") {
            throw new HTTPException(403, { message: "Forbbiden" });
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
                ...dateClause
                
            },
            include: {
                pet: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { date: 'asc' }
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

        /* admins can update the appointment table by any means, passing through any date time or appointment quantity per 
        user constraint */
        const start = data.date ? new Date(data.date) : existingAppointment.date;
        let end = existingAppointment.endDate;

        if (data.serviceType) {
            const duration = SERVICE_DURATION[data.serviceType];
            end = new Date(start.getTime() + duration * 60 * 1000);
        }
        // se mudou só a data → mantém duração original
        else if (data.date && existingAppointment.endDate) {
            const originalDuration = existingAppointment.endDate.getTime() - existingAppointment.date.getTime();
            end = new Date(start.getTime() + originalDuration);
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