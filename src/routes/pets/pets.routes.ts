import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../../middleware/auth.js';
import { HTTPException } from 'hono/http-exception';
import { petsService } from "./pets.service.js"; /* listByFilter, listByUser, getById, create, update, delete */
import { listPetsQuerySchema } from './pets.schema.js';

const app = new Hono<AuthEnv>()

/* auth middleware to guarantee only authenticated users has access to these routes */
app.use('*', authMiddleware);

/* @desc list the current user's pets with filtering
   @route GET https://example.com/api/pets/me?name=Rex&species=DOG&breed=pitbull
   @access private (USER, ADMIN) */
app.get('/me', async (ctx) => {
    const user = ctx.get("user");

	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const rawQuery = ctx.req.query;
	const validation = listPetsQuerySchema.safeParse(rawQuery);

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation failed, invalid filters", cause: validation.error })
    }

	const query = validation.data;

	let finalUserIdFilter: string | undefined;

    const pets = await petsService.listByUser(
        user.id, 
		{
			name: query.name,
			species: query.species,
			breed: query.breed,
		}
    );
	
    return ctx.json({ pets });
});

/* @desc list any pets with filtering
   @route GET https://example.com/api/pets/userId=1234&name=Rex&species=DOG&breed=pitbull
   @access private (ADMIN) */
app.get('/', async (ctx) => {
    const user = ctx.get("user");

	if (!user || user.role == "ADMIN") {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const rawQuery = ctx.req.query;
	const validation = listPetsQuerySchema.safeParse(rawQuery);

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation failed, invalid filters", cause: validation.error })
    }

	const query = validation.data;

    const pets = await petsService.listByFilter({
        userId: query.userId,
		name: query.name,
		species: query.species,
		breed: query.breed,
    });

    return ctx.json({ pets });
});

export default app;