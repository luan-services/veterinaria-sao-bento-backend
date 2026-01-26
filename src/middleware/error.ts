import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const errorMiddleware = () => {
    return (err: Error, ctx: Context) => {

        /* initialize error as internal server error (unknown) */
        let status: ContentfulStatusCode = 500
        let message = 'Internal Server Error'

        /* if it was thrown by the backend logic, it is a known error, so we handle it */
        if (err instanceof HTTPException) {
            status = err.status
            message = err.message
        }

        /* log only system errors */
        if (status >= 500) {
            console.error('System Error:', err)
        }

        /* sends json response to the frontend */
        return ctx.json({
            success: false,
            message: message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, status)
    }
}