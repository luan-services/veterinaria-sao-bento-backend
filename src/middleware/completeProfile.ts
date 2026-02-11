import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AuthEnv } from "./auth.js";

/* this middleware must be used after auth.ts middleware, it assumes there is already an user field on the request */

export const requireCompleteProfileMiddleware = createMiddleware<AuthEnv>(async (ctx, next) => {
    const user = ctx.get('user');
    
    if ((!user?.profileCompleted) && user?.role != "ADMIN") {
        throw new HTTPException(403, { message: 'Profile Incomplete' });
    }
    
    await next();
})