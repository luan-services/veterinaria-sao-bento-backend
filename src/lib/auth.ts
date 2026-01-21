import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    trustedOrigins: process.env.NODE_ENV === "production" ? 
        [process.env.ALLOWED_CORS_URLS!] : ["http://localhost:3000"], /* allow next (port 3000) to access this provider */
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production" 
    }
});

/* this handler automatically creates the following routes:

POST /api/auth/sign-up (sign-up with email/password)

POST /api/auth/sign-in (login with email/password)

POST /api/auth/sign-out (logout)

GET /api/auth/get-session (check if is logged in)

POST /api/auth/sign-in/social (google auth flux start)

GET /api/auth/callback/google (google callback return) */
