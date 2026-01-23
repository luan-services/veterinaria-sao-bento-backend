import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { z } from "zod";

/* validation schema for password */
const passwordSchema = z.object({
    password: z.string()
    .min(8, "Password is expected to have more than 8 characters")
    .max(60, "Password is expected to have less than 60 characters")
    .regex(/[A-Z]/, "Password is expected to have at least a upper case letter")
    .regex(/[a-z]/, "Password is expected to have at least a lower case letter")
    .regex(/[0-9]/, "Password is expected to have at least a number")
    .regex(/[\W_]/, "Password is expected to have at least a symbol")
})

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            lastName: {
                type: "string",
                required: true, /* enforces validation before hitting the DB */
                input: true,    /* allows this field to be passed from the signUp client */
                returned: false
            },
            role: {
                type: "string",
                required: false,
                defaultValue: "USER", 
                input: false, /* never let the frontend set its own role */
            },
            phone: {
                type: "string",
                required: false,
                input: true,
                returned: false
            },
            address: {
                type: "string",
                required: false,
                input: true,
                returned: false
            },
            cpf: {
                type: "string",
                input: true,
                returned: false
            }
        }
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-up/email") { /* this guarantees this middleware only runs on register by e-mail route */
                const body = ctx.body; 

                if (body?.password) {
                    /* if body.password exists validate it with zod schema */
                    const validation = passwordSchema.safeParse({password: body.password}); 

                    if (!validation.success) { /* if not valid, throws better auth API Error */
                        throw new APIError("BAD_REQUEST", {
                            message: validation.error.issues[0].message
                        });
                    }
                    
                }
            }
        }),
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            mapProfileToUser: (profile) => {
                return {
                    /* when log in with google, it will fill our lastName custom field with google's 'family_name' */
                    lastName: profile.family_name, /* Google sends 'family_name' for the last name */
                }
            },
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
