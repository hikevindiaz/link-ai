import { User } from "next-auth"
import { JWT } from "next-auth/jwt"
import { type DefaultSession } from "next-auth"

// Define the shape of the integration settings map
type IntegrationSettingsMap = Record<string, boolean>;

type UserId = string

declare module "next-auth/jwt" {
    interface JWT {
        id: UserId
        // Add integration settings to the JWT type
        integrationSettings?: IntegrationSettingsMap
        emailVerified?: boolean
        onboardingCompleted?: boolean
        role?: string
        status?: string
    }
}

declare module "next-auth" {
    interface Session {
        user: {
            id: UserId
            // Add integration settings to the Session User type
            integrationSettings?: IntegrationSettingsMap
            emailVerified: boolean
            onboardingCompleted: boolean
            role: string
            status: string
        } & DefaultSession["user"]
    }

    interface User {
        id: UserId
        integrationSettings?: IntegrationSettingsMap
        emailVerified?: boolean
        onboardingCompleted?: boolean
        role?: string
        status?: string
    }
} 