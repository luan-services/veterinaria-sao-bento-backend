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
    phone: z.string().trim()
        .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Invalid phone number format")
        .transform((value) => value.replace(/\D/g, "")), // remove dots and dashes to send only numbers to backend
    cpf: z.string().trim()
        .refine((value) => cpf.isValid(value), {
            message: "Invalid CPF", 
        })
        .transform((val) => val.replace(/\D/g, "")), // remove dots and dashes to send only numbers to backend
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
        .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Invalid phone number format")
        .transform((val) => val.replace(/\D/g, "")),
    cpf: z.string().trim()
        .refine((value) => cpf.isValid(value), {
            message: "Invalid CPF", 
        })
        .transform((val) => val.replace(/\D/g, ""))
});

export const passwordUpdateSchema = z.object({
    newPassword: z.string().trim()
        .min(8, "Password is expected to have more than 8 characters")
        .max(60, "Password is expected to have less than 60 characters")
        .regex(/[A-Z]/, "Password is expected to have at least one uppercase letter")
        .regex(/[a-z]/, "Password is expected to have at least one lowercase letter")
        .regex(/[0-9]/, "Password is expected to have at least one number")
        .regex(/[\W_]/, "Password is expected to have at least one symbol"),
    token: z.string().trim()
        .min(1, "Token can't be blank")
        .max(200, "Name is expected to have less than 200 characters"),

});

const allowedOrigins = process.env.ALLOWED_CORS_URLS ? JSON.parse(process.env.ALLOWED_CORS_URLS) : ["http://localhost:3000"];

const getTrustedOrigins = () => {
    if (process.env.NODE_ENV !== "production") {
        return ["http://localhost:3000"];
    }

    return allowedOrigins;
};

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true, /* make verifying required before login */
        sendResetPassword: async ({user, url, token}, request) => {
            /* here is where we should add an e-mail provider to send a mail with the 
            verification url to the user, for now, we just log on the console */
            console.log(url)
        },
    },
    emailVerification: {
        sendOnSignUp: true, /* when register, it will automatically send an email */
        autoSignInAfterVerification: true,/* user sign in after verification */
        sendVerificationEmail: async ({ user, url, token }, request) => {
            /* here is where we should add an e-mail provider to send a mail with the 
            verification url to the user, for now, we just log on the console */
            console.log(url)
        }
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
            },
            profileCompleted: { 
                type: "boolean", 
                returned: true, 
                defaultValue: false,
                required: false
            }
        }
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            process.env.NODE_ENV === "production" ? console.log(ctx.path) : "";
            if (ctx.path === "/sign-up/email") { /* this guarantees this middleware only runs on register by e-mail route */
                const body = ctx.body; 
                const validation = userRegisterSchema.safeParse(body); 

                if (!validation.success) { /* if not valid, throws better auth API Error */
                    throw new APIError("BAD_REQUEST", {
                        message: validation.error.issues[0].message
                    });
                }

                /* since our cpf field is unique, we must check if there is already an user registered with it to
                throw an error and send a response to the frontend, if you don't do that, a generic error will be sent
                and the front will have no clue what is the problem */
                const existingUser = await prisma.user.findUnique({
                    where: { cpf: validation.data.cpf },
                });

                if (existingUser) {
                    throw new APIError("BAD_REQUEST", {
                        message: "This CPF already exists",
                    });
                }

                /* since we are creating account with email, validation only works if profile is completed, 
                so we set the profileCompleted field as true before sending to the backend */
                return {
                    context: {
                        ...ctx,
                        body: {
                            ...ctx.body,
                            ...validation.data,
                            profileCompleted: true,
                        },
                    }
                };
            }

            if (ctx.path === "/update-user") { /* this guarantees this middleware only runs when user tries to udpate their data */
                const body = ctx.body; 
                const validation = userUpdateSchema.partial().safeParse(body); 
                
                if (!validation.success) { /* if not valid, throws better auth API Error */
                    throw new APIError("BAD_REQUEST", {
                        message: validation.error.issues[0].message
                    });
                };

                /* since our cpf field is unique, we must check if there is already an user registered with it to
                throw an error and send a response to the frontend, if you don't do that, a generic error will be sent
                and the front will have no clue what is the problem */
                const existingUser = await prisma.user.findUnique({
                    where: { cpf: validation.data.cpf },
                });

                if (existingUser) {
                    throw new APIError("BAD_REQUEST", {
                        message: "This CPF already exists",
                    });
                }

                return {
                    context: {
                        ...ctx,
                        body: {
                            ...ctx.body,
                            ...validation.data, 
                        }
                    }
                };
            }

            if (ctx.path === "/reset-password") { /* this is for the new reset password route, we should parse the same password rules here */
                const body = ctx.body; 

                const validation = passwordUpdateSchema.safeParse(body);

                if (!validation.success) {
                    throw new APIError("BAD_REQUEST", {
                        message: validation.error.issues[0].message
                    });
                }
            }
        }),
        after: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/update-user") {
                const userId = ctx.context.session?.user.id;
                
                if (!userId) {
                    return; 
                }

                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { cpf: true, phone: true, profileCompleted: true }
                });

                if (!user) {
                    return;
                }

                const isComplete = !!(user.cpf && user.phone);
                
                if (user.profileCompleted !== isComplete) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { profileCompleted: isComplete }
                    });
                }
            }
        }),
    },
    baseURL: process.env.BETTER_AUTH_URL,
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
    trustedOrigins: getTrustedOrigins(), /* allow next (port 3000) to access this provider */
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
