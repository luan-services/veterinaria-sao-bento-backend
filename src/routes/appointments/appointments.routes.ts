import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../../middleware/auth.js';
import { requireCompleteProfileMiddleware } from '../../middleware/completeProfile.js';
import { HTTPException } from 'hono/http-exception';
import { appointmentsService } from "./appointments.service.js";
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsQuerySchema } from './appointments.schema.js';

import { strictRateLimiter } from '../../middleware/rateLimiter.js';

const app = new Hono<AuthEnv>()

app.use('*', authMiddleware);

app.use('*', requireCompleteProfileMiddleware);

/* @desc public view of the schedule (available/busy slots)
   @route GET /api/appointments/schedule?startDate=...&endDate=...
   @access Private (USER, ADMIN) */
app.get('/schedule', async (ctx) => {
    const rawQuery = ctx.req.query();
    
    const validation = listAppointmentsQuerySchema.safeParse(rawQuery);

    if (!validation.success) {
        throw new HTTPException(400, { message: "Invalid filters", cause: validation.error });
    }

    // Chama o serviço otimizado que usa .select() para não vazar dados sensíveis
    const schedule = await appointmentsService.getSchedule(validation.data);
    
    return ctx.json({ schedule });
});

/* @desc list current user's appointments history
   @route GET /api/appointments/me?status=PENDING
   @access Private (USER) */
app.get('/me', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const rawQuery = ctx.req.query();
    const validation = listAppointmentsQuerySchema.safeParse(rawQuery);

    if (!validation.success) {
        throw new HTTPException(400, { message: "Invalid filters", cause: validation.error });
    }

    const appointments = await appointmentsService.listByUser(user.id, validation.data);
    
    return ctx.json({ appointments });
});

/* @desc list ALL appointments with full details for admins
   @route GET /api/appointments?startDate=...&professionalId=...
   @access Private (ADMIN) */
app.get('/', async (ctx) => {
    const user = ctx.get("user");
    
    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const rawQuery = ctx.req.query();
    const validation = listAppointmentsQuerySchema.safeParse(rawQuery);

    if (!validation.success) {
        throw new HTTPException(400, { message: "Invalid filters", cause: validation.error });
    }

    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
	need this only for it to stop complaining */

    const appointments = await appointmentsService.listByFilter(
        role,
        user.id, 
        validation.data
    );

    return ctx.json({ appointments });
});

/* @desc request a new appointment
   @route POST /api/appointments
   @access Private (USER) */
app.post('/', strictRateLimiter, async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await ctx.req.json();
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
        throw new HTTPException(400, { message: "Invalid body", cause: validation.error });
    }

    const newAppointment = await appointmentsService.create(user.id, validation.data);
    
    return ctx.json(newAppointment, 201);
});

/* @desc cancel an appointment (user cancels own, admin cancels any)
   @route PATCH /api/appointments/cancel/:id
   @access Private (USER, ADMIN) */
app.patch('/:id/cancel', strictRateLimiter, async (ctx) => {
    const user = ctx.get("user");
    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const appointmentId = ctx.req.param('id');
    const role = user.role ?? "USER";

    const cancelled = await appointmentsService.cancel(appointmentId, user.id, role);

    return ctx.json(cancelled);
});

/* @desc general update for admins (reschedule, confirm, assign professional)
   @route PATCH /api/appointments/:id
   @access Private (ADMIN) */
app.patch('/:id', strictRateLimiter, async (ctx) => {
    const user = ctx.get("user");
    
    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const id = ctx.req.param('id');
    const body = await ctx.req.json();
    const validation = updateAppointmentSchema.safeParse(body);

    if (!validation.success) {
        throw new HTTPException(400, { message: "Invalid body", cause: validation.error });
    }

    const role = user.role ?? "USER";

    const updated = await appointmentsService.update(
        id, 
        role, 
        validation.data
    );

    return ctx.json(updated);
});

/* @desc hard delete an appointment (must be cancelled first)
   @route DELETE /api/appointments/:id
   @access Private (ADMIN ONLY) */
app.delete('/:id', strictRateLimiter, async (ctx) => {
    const user = ctx.get("user");
    
    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const id = ctx.req.param('id');
    const role = user.role ?? "USER";
    
    await appointmentsService.delete(id, role);

    return ctx.json({ message: "Appointment deleted successfully" });
});

export default app;