import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth.js'
import { secureHeaders } from 'hono/secure-headers'
import { errorMiddleware } from './middleware/error.js'
import { globalRateLimiter } from './middleware/rateLimiter.js'

/* routes */
import petsRouter from "./routes/pets/pets.routes.js"
import locationsRouter from "./routes/locations/locations.routes.js"
import professionalsRouter from "./routes/professionals/professionals.routes.js"
import appointmentsRouter from "./routes/appointments/appointments.routes.js"

/* this backend is configured for deploy on traditional servers Render, Railway, DigitalOcean (VPS), because of node-server environmnet 
and prisma Client, for serverless plataforms Vercel, Cloudflare Workers, AWS Lambda it would need a whole different setup for 
EDGE environment */

/* SQL Inject is protected by Prisma */
/* CORS is configured */
/* secureHeaders ok */
/* CSRF and Auth protection configured by better auth */
/* XSS script injection: zod is cleaning all auth fields, must check other routes */
/* rate limiter: if deployed to Render, Railway, Digital Ocean (VPS) it is fine as it is */
/* IDOR protection: must check each route */

const app = new Hono()

const allowedOrigins = process.env.ALLOWED_CORS_URLS ? JSON.parse(process.env.ALLOWED_CORS_URLS) : ["http://localhost:3000"];

app.use("/api/*", globalRateLimiter);

app.use('*', cors({
	origin: (origin, c) => {

		if (!origin) {
			return origin;
		}

		if (process.env.NODE_ENV !== 'production') {
			return origin;
		}
		
		if (allowedOrigins.includes(origin)) {
			return origin;
		}
		
		return null;
	},
	allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
	credentials: true, /* must use credentials true for cookies */
}));

app.use('*', secureHeaders());

app.onError(errorMiddleware());

app.route('/api/pets', petsRouter);
app.route('/api/locations', locationsRouter);
app.route('/api/professionals', professionalsRouter);
app.route('/api/appointments', appointmentsRouter);

app.get('/', (c) => {
	return c.text('Hello Hono!')
})

/* this route start the better auth routes, it send all requests to /api/auth/** directly to the auth.ts handler */
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw);
});

serve(
	{
		fetch: app.fetch,
		port: 4000 /* must  change the port because next.js also runs on port 3000 */
	}, 
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`)
	}
)
