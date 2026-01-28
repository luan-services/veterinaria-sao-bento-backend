import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth.js'
import { errorMiddleware } from './middleware/error.js'

/* routes */
import petsRouter from "./routes/pets/pets.routes.js"
import locationsRouter from "./routes/locations/locations.routes.js"

const app = new Hono()

const allowedOrigins = process.env.ALLOWED_CORS_URLS ? JSON.parse(process.env.ALLOWED_CORS_URLS) : ["https://refactored-adventure-97wrq97555jxf77j9-3000.app.github.dev"];

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
}))

app.onError(errorMiddleware());

app.route('/api/pets', petsRouter);
app.route('/api/locations', locationsRouter);

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
