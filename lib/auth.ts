import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from '@/lib/prisma'

export const auth = betterAuth({
    appName: 'Leto',
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 10,
    },
    advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
    },
})