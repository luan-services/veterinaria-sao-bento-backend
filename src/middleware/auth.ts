import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js"
import { HTTPException } from "hono/http-exception";

/* define type and export, for TS to use them */
export type AuthEnv = {
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (ctx, next) => {
    const headers = ctx.req.raw.headers;

    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        ctx.set("user", null);
        ctx.set("session", null);
        /* instead of returning an error with ctx.json(), we throw a new Error and let our errorHandler middleware to manage it */
        throw new HTTPException(401, { message: 'Invalid or expired Session' })
    }
    

    ctx.set("user", session.user);
    ctx.set("session", session.session);

    await next();
});