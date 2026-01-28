import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../../middleware/auth.js';
import { HTTPException } from 'hono/http-exception';
import { locationsService } from "./locations.service.js"; /* listAll create, update, delete */
import { createLocationSchema, updateLocationSchema } from './locations.schema.js';

const app = new Hono<AuthEnv>()

/* auth middleware to guarantee only authenticated users has access to these routes */
app.use('*', authMiddleware);

/* @desc list all locations
   @route GET https://example.com/api/locations
   @access private (USER, ADMIN) */
app.get('/', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const locations = await locationsService.listAll();
    
    return ctx.json({ locations });
});

/* @desc create a new location
   @route POST https://example.com/api/locations
   @access private (ADMIN) */
app.post('/', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await ctx.req.json()
    const validation = createLocationSchema.safeParse(body)

    if (!validation.success) {
        throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const newLocation = await locationsService.create(role, validation.data);
    return ctx.json(newLocation, 201);
})

/* @desc update a location row
   @route PATCH https://example.com/api/locations/:id
   @access private (ADMIN) */
app.patch('/:id', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await ctx.req.json()
    const validation = updateLocationSchema.safeParse(body)

    if (!validation.success) {
        throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

    const locationId = ctx.req.param('id');
    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const updatedLocation = await locationsService.update(role, locationId, validation.data);
    return ctx.json(updatedLocation, 200);
})


/* @desc delete a location
   @route DELETE https://example.com/api/location/:id
   @access private (ADMIN) */
app.delete('/:id', async (ctx) => {
    const user = ctx.get("user");

    if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }

    const locationId = ctx.req.param('id');
    const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
    need this only for it to stop complaining */

    const deleted = await locationsService.delete(role, locationId);
    /* no need to check if (!deleted) here, service already does that */
    return ctx.json({ message: "Location successfully deleted." });
})

export default app;