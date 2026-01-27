import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../../middleware/auth.js';
import { HTTPException } from 'hono/http-exception';
import { petsService } from "./pets.service.js"; /* listByFilter, listByUser, getById, create, update, delete */
import { createPetSchema, listPetsQuerySchema, updatePetSchema } from './pets.schema.js';

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

	const rawQuery = ctx.req.query();
	const validation = listPetsQuerySchema.safeParse(rawQuery);

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation failed, invalid filters", cause: validation.error })
    }

	const query = validation.data;

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

	if (!user || user.role !== "ADMIN") {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const rawQuery = ctx.req.query();
	const validation = listPetsQuerySchema.safeParse(rawQuery);

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation Error, invalid params", cause: validation.error })
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

/* @desc create a new pet
   @route POST https://example.com/api/pets
   @access private (USER, ADMIN) */
app.post('/', async (ctx) => {
	const user = ctx.get("user");

	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const body = await ctx.req.json()
	const validation = createPetSchema.safeParse(body)

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

	const newPet = await petsService.create(user.id, validation.data);
	return ctx.json(newPet, 201);
})

/* @desc update an user's pet fields 
   @route PATCH https://example.com/api/pets/:id
   @access private (USER, ADMIN) */
app.patch('/:id', async (ctx) => {
	const user = ctx.get("user");

	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const body = await ctx.req.json()
	const validation = updatePetSchema.safeParse(body)

	if (!validation.success) {
		throw new HTTPException(400, {  message: "Validation Error, invalid body", cause: validation.error })
    }

	const petId = ctx.req.param('id');

	const updatedPet = await petsService.update(petId, user.id, validation.data);
	return ctx.json(updatedPet, 200);
})


/* @desc list any pets with filtering
   @route GET https://example.com/api/pets/userId=1234&name=Rex&species=DOG&breed=pitbull
   @access private (ADMIN) */
app.delete('/:id', async (ctx) => {
	const user = ctx.get("user");

	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const petId = ctx.req.param('id');
	const role = user.role ?? "USER"; /* typescript thinks role is optional because of better auth, but it is not, 
	need this only for it to stop complaining */
	const deleted = await petsService.delete(petId, user.id, role);
	/* no need to check if (!deleted) here, service already does that */
	return ctx.json({ message: "Pet successfully deleted." });
})

export default app;