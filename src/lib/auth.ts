import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { z } from "zod";
import { cpf } from "cpf-cnpj-validator";

export const userRegisterSchema = z.object({
    password: z.string().trim()
        .min(8, "Password is expected to have more than 8 characters")
        .max(60, "Password is expected to have less than 60 characters")
        .regex(/[A-Z]/, "Password is expected to have at least one uppercase letter")
        .regex(/[a-z]/, "Password is expected to have at least one lowercase letter")
        .regex(/[0-9]/, "Password is expected to have at least one number")
        .regex(/[\W_]/, "Password is expected to have at least one symbol"),
    name: z.string().trim()
        .min(1, "Name can't be blank")
        .max(60, "Name is expected to have less than 60 characters")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Name must contain only letters"),
    lastName: z.string().trim()
        .min(1, "Last name can't be blank")
        .max(60, "Last name is expected to have less than 60 characters")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Last name must contain only letters"),
});

export const userUpdateSchema = z.object({
    name: z.string().trim()
        .min(1, "Name can't be blank")
        .max(60, "Name is expected to have less than 60 characters")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Name must contain only letters"),
    lastName: z.string().trim()
        .min(1, "Last name can't be blank")
        .max(60, "Last name is expected to have less than 60 characters")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Last name must contain only letters"),
    phone: z.string().trim()
        .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Invalid phone number format"),
    cpf: z.string().trim()
        .refine((value) => cpf.isValid(value), {
            message: "Invalid CPF", 
        })
});

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
                required: false,
                input: true,
                returned: false
            }
        }
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            console.log(ctx.path);
            if (ctx.path === "/sign-up/email") { /* this guarantees this middleware only runs on register by e-mail route */
                const body = ctx.body; 
                const validation = userRegisterSchema.safeParse(body); 

                if (!validation.success) { /* if not valid, throws better auth API Error */
                    throw new APIError("BAD_REQUEST", {
                        message: validation.error.issues[0].message
                    });
                }
            }

            if (ctx.path === "/update-user") { /* this guarantees this middleware only runs when user tries to udpate their data */
                const body = ctx.body; 
                const validation = userUpdateSchema.partial().safeParse(body); 
                
                if (!validation.success) { /* if not valid, throws better auth API Error */
                    throw new APIError("BAD_REQUEST", {
                        message: validation.error.issues[0].message
                    });
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
    trustedOrigins: process.env.NODE_ENV === "production" && process.env.ALLOWED_CORS_URLS ? 
        JSON.parse(process.env.ALLOWED_CORS_URLS) : ["http://localhost:3000", "*"], /* allow next (port 3000) to access this provider */
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
