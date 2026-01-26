import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth.js'
import { errorMiddleware } from './middleware/error.js'

const app = new Hono()

app.use('*', cors({
	origin: (origin, c) => {

		if (process.env.NODE_ENV !== 'production') {
			return origin || 'http://localhost:3000';
		}
		
		const allowedOrigin = process.env.ALLOWED_CORS_URLS;
		
		// Retorna a origem se bater, ou null se não bater
		return origin === allowedOrigin ? origin : null;
	},
	allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
	credentials: true, /* must use credentials true for cookies */
}))

app.onError(errorMiddleware());

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
