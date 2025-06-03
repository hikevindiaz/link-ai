import { type NextAuthOptions, Profile, Account } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "./emails/send-welcome";
import { PrismaClient } from "@prisma/client"; // Import Prisma Client
import { email } from "@/lib/email";

// --- Magic SDK Initialization --- 
let Magic: any;
let magicAdmin: any;

console.log("Auth module initializing");
console.log("DATABASE_URL format check:", process.env.DATABASE_URL?.substring(0, 12));
console.log("DIRECT_URL format check:", process.env.DIRECT_URL?.substring(0, 12));

if (typeof window === 'undefined') {
  try {
    console.log("Initializing Magic SDK on server");
    // Ensure require is used correctly for server-side CJS module
    const MagicAdmin = require('@magic-sdk/admin').Magic;
    
    if (!process.env.MAGIC_SECRET_KEY) {
      console.error("MAGIC_SECRET_KEY is missing or empty!");
    } else {
      console.log("MAGIC_SECRET_KEY is configured [Key hidden]");
      // Assign to the globally scoped variable
      magicAdmin = new MagicAdmin(process.env.MAGIC_SECRET_KEY);
      console.log("Magic admin client initialized successfully");
    }
  } catch (error) {
    console.error("Failed to initialize Magic admin client:", error);
    // Set magicAdmin to null or handle the error appropriately
    magicAdmin = null;
  }
}
// --- End Magic SDK Initialization ---

console.log("Prisma client initialized:", !!db);

type IntegrationSettingsMap = Record<string, boolean>;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as any),
  debug: process.env.NODE_ENV !== 'production',
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined // Let Next.js handle domain automatically
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      }
    }
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  logger: {
    error(code, metadata) {
      console.error(`[Auth Error] ${code}:`, metadata);
    },
    warn(code) {
      console.warn(`[Auth Warning] ${code}`);
    },
    debug(code, metadata) {
      console.log(`[Auth Debug] ${code}:`, metadata);
    },
  },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Magic Link",
      credentials: {
        didToken: { label: "DID Token", type: "text" },
      },
      async authorize(credentials) {
        console.log("=== MAGIC AUTH FLOW STARTED ===");
        // Check if magicAdmin was initialized successfully
        if (!magicAdmin) {
           console.error("Magic Admin SDK not initialized. Cannot authorize.");
           return null;
        }
        try {
          console.log("Checking credentials");
          const didToken = credentials?.didToken;
          if (!didToken) {
            console.error("No DID token provided");
            throw new Error("No DID token provided");
          }
          console.log("DID token received [token hidden]");

          try {
            console.log("Testing database connection");
            const dbTest = await db.$queryRaw`SELECT 1 as test`;
            console.log("Database connection test result:", dbTest);
          } catch (dbError) {
            console.error("Database connection test failed:", dbError);
          }

          console.log("Validating Magic token");
          try {
            await magicAdmin.token.validate(didToken);
            console.log("Magic token validation successful");
          } catch (validationError) {
            console.error("Magic token validation failed:", validationError);
            throw validationError;
          }

          console.log("Getting user metadata from Magic");
          let metadata;
          try {
            metadata = await magicAdmin.users.getMetadataByToken(didToken);
            console.log("User email from Magic:", metadata.email);
          } catch (metadataError) {
            console.error("Failed to get user metadata:", metadataError);
            throw metadataError;
          }

          console.log("Looking for user in database");
          let user;
          try {
            user = await db.user.findFirst({
              where: { email: metadata.email },
            });
            console.log("User lookup result:", user ? "User found" : "User not found");
          } catch (findError) {
            console.error("Error finding user:", findError);
            throw findError;
          }
          
          if (!user) {
            console.log("Creating new user in database");
            try {
              user = await db.user.create({
                data: {
                  email: metadata.email,
                  name: metadata.email.split('@')[0], 
                },
              });
              console.log("New user created successfully:", user.id);
              // Trigger createUser event manually after successful creation if needed
              // This assumes you have specific logic in the createUser *event*
              // await options.events?.createUser?.({ user }); 
            } catch (createError) {
              console.error("Error creating user:", createError);
              throw createError;
            }
          }

          console.log("=== MAGIC AUTH FLOW COMPLETED SUCCESSFULLY ===");
          return user;
        } catch (error) {
          console.error("=== MAGIC AUTH FLOW FAILED ===");
          console.error("Magic Link authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      console.log("Session callback called with token:", token);
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.integrationSettings = token.integrationSettings as IntegrationSettingsMap ?? {};
        session.user.emailVerified = token.emailVerified as boolean ?? false;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean ?? false;
        console.log("Integration settings added to session:", session.user.integrationSettings);
      }
      console.log("Session callback completed with session:", session);
      return session;
    },
    async jwt({ token, user, trigger, session: updateSessionData }) {
      console.log("JWT callback called. Trigger:", trigger, "User:", user, "Token:", token);
      
      // Get the user ID from the token if it exists, otherwise from the user object (initial sign in)
      const userId = token?.id as string ?? user?.id;

      // If we have a userId, always try to fetch the latest data from the DB
      if (userId) {
        try {
          console.log(`Fetching DB user and settings for JWT. User ID: ${userId}`);
          const dbUser = await db.user.findUnique({
            where: { id: userId },
            include: {
              integrationSettings: true, // Include related settings
            },
          });
          console.log("JWT DB user lookup result:", dbUser ? "User found" : "User not found");

          if (dbUser) {
            // Always update token with the latest DB info
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            token.emailVerified = Boolean(dbUser.emailVerified);
            token.onboardingCompleted = dbUser.onboardingCompleted;

            // Process integration settings into a map
            const settingsMap: IntegrationSettingsMap = {};
            dbUser.integrationSettings.forEach(setting => {
              settingsMap[setting.integrationId] = setting.isEnabled;
            });
            token.integrationSettings = settingsMap; // Add/Update settings map in token
            console.log("Integration settings updated in JWT:", token.integrationSettings);

          } else {
             console.warn(`JWT: User with ID ${userId} not found in DB. Token might be stale.`);
             // If user not found in DB, maybe clear outdated settings?
             token.integrationSettings = {}; 
          }
        } catch (error) {
          console.error(`Error fetching user/settings for JWT (User ID: ${userId}):`, error);
          // Keep existing token data if fetch fails, but log error
        }
      } else if (user) {
          // Fallback for initial sign-in if somehow userId wasn't available above
          // This case might be less likely now
          console.log("JWT: Using initial user object info");
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
          token.integrationSettings = {}; // No settings available yet
          // New users should not be verified or onboarded
          token.emailVerified = false;
          token.onboardingCompleted = false;
      }

      console.log("JWT callback completed. Returning token:", token);
      return token;
    },
    async signIn({ user, account, profile, email, credentials }) {
        console.log("signIn callback:", { user, account, profile, email, credentials });
        return true // Or custom logic
      },
  },
  events: {
    async createUser(message) {
        console.log("createUser event:", message.user);
        // Send welcome email
        try {
          // Check required fields before sending
          if (message.user.email) { 
            await sendWelcomeEmail({ 
                email: message.user.email, 
                name: message.user.name ?? message.user.email.split('@')[0] // Use name or derive from email
            });
            console.log("Welcome email sent to:", message.user.email);
            
            // Generate and send verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            
            // Create verification token
            await db.emailVerificationToken.upsert({
              where: { userId: message.user.id },
              update: {
                code: verificationCode,
                expiresAt: expiresAt
              },
              create: {
                userId: message.user.id,
                code: verificationCode,
                expiresAt: expiresAt
              }
            });
            
            // Send verification email
            if (email && message.user.email) {
              const { render } = await import('@react-email/render');
              const EmailConfirmationEmail = (await import('@/emails/confirm-email')).default;
              
              const emailHtml = await render(EmailConfirmationEmail({
                confirmationCode: verificationCode,
                theme: 'light'
              }));

              await email.emails.send({
                from: 'Link AI <no-reply@getlinkai.com>',
                to: message.user.email,
                subject: `Your Link AI confirmation code: ${verificationCode}`,
                html: emailHtml,
              });
              
              console.log("Verification email sent to:", message.user.email);
            }
          } else {
              console.warn("Cannot send welcome email: email is missing.");
          }
        } catch (emailError) {
          console.error("Failed to send welcome/verification email:", emailError);
        }
      },
      async signOut(message) {
        console.log("signOut event:", message); // signOut is an event
      },
  }
};