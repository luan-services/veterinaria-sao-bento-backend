/* this rate-limiter works only on tradicional 24/7 servers like Render, Railway (WHEN USING A SINGLE INSTACE OF THE APP), 
DigitalOcean (VPS), because it depends on RAM memory to count the access attempts. 

on serverless plataforms like Vercel, Cloudflare Workers, AWS Lambda this won't work, because there is no server online, these
plataforms runs the app everytime someone access it and destroys seconds later. */

/* if added domain protection and later, must updated the middleware to get the cloudflare proxy user ip */

import { rateLimiter } from "hono-rate-limiter";
import type { AuthEnv } from "./auth.js";
import type { Context } from "hono";

function getClientIp(c: Context) {
    /* "cf-connecting-ip" checks first if it is being proxied bt cloudflare with the user ip */
    const cf = c.req.header("cf-connecting-ip")
    if (cf) {
        return cf;
    }
    
    /* in production, x-forwarded-for might be a bunch of ips 203.0.113.1, 70.41.3.18, 150.172.238.178 from every server
    it was parsed, being the first one the client ip, so we must split and try to get the first one */
    const xf = c.req.header("x-forwarded-for")
    if (xf) {
        return xf.split(",")[0].trim();
    }

    return "anonymous";
}

export const globalRateLimiter = rateLimiter({
    windowMs: 60 * 1000,
    limit: 100,

    keyGenerator: (c) => {
        return getClientIp(c);
    },

    standardHeaders: true,
});

export const strictRateLimiter = rateLimiter<AuthEnv>({
    windowMs: 60 * 1000,
    limit: 10,

    keyGenerator: (c) => {
        const user = c.get("user");

        if (user?.id) {
            return `user:${user.id}`;
        }

        return getClientIp(c);
    },

    standardHeaders: true,
});

/* in dev, hono does not sends an IP, so this is needed on index.ts to forward an ip, if want to test better auth built-in 
rate limiter

    app.on(['POST', 'GET'], '/api/auth/**', (c) => {
        
        const request = new Request(c.req.raw);
        const info = getConnInfo(c);
        if (info.remote.address) {
            request.headers.set("x-forwarded-for", info.remote.address);
        }
        return auth.handler(request);

        return auth.handler(c.req.raw);
    });
*/