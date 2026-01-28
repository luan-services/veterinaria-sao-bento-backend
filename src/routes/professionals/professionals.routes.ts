import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../../middleware/auth.js';
import { HTTPException } from 'hono/http-exception';
import { professionalsService } from './professionals.service.js'; /* listAll create, update, delete */
import { createProfessionalSchema, updateProfessionalSchema } from './professionals.schema.js';

const app = new Hono<AuthEnv>()

/* auth middleware to guarantee only authenticated users has access to these routes */
app.use('*', authMiddleware);

/* @desc list all professionals
   @route GET https://example.com/api/professionals
   @access private (USER, ADMIN) */
app.get('/', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const professional = await professionalsService.listAll();
    
    return ctx.json({ professional });
});

/* @desc create a new professional
   @route POST https://example.com/api/professionals
   @access private (ADMIN) */
app.post('/', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await ctx.req.json()
    const validation = createProfessionalSchema.safeParse(body)

    if (!validation.success) {
        throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const newProfessional = await professionalsService.create(role, validation.data);
    return ctx.json(newProfessional, 201);
})

/* @desc update a professional row
   @route PATCH https://example.com/api/professionals/:id
   @access private (ADMIN) */
app.patch('/:id', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await ctx.req.json()
    const validation = updateProfessionalSchema.safeParse(body)

    if (!validation.success) {
        throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

    const professionalId = ctx.req.param('id');
    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const updatedProfessional = await professionalsService.update(role, professionalId, validation.data);
    return ctx.json(updatedProfessional, 200);
})


/* @desc delete a professional
   @route DELETE https://example.com/api/professionals/:id
   @access private (ADMIN) */
app.delete('/:id', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const professionalId = ctx.req.param('id');
    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const deleted = await professionalsService.delete(role, professionalId);
    /* no need to check if (!deleted) here, service already does that */
    return ctx.json({ message: "Professional successfully deleted." });
})

export default app;