import { User } from "next-auth"
import { JWT } from "next-auth/jwt"

// Define the shape of the integration settings map
type IntegrationSettingsMap = Record<string, boolean>;

type UserId = string

declare module "next-auth/jwt" {
    interface JWT {
        id: UserId
        // Add integration settings to the JWT type
        integrationSettings?: IntegrationSettingsMap
    }
}

declare module "next-auth" {
    interface Session {
        user: User & {
            id: UserId
            // Add integration settings to the Session User type
            integrationSettings?: IntegrationSettingsMap
        }
    }
} 