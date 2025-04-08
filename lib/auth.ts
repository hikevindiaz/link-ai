import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
let Magic: any;
let magicAdmin: any;

// Add logging for initialization
console.log("Auth module initializing");
console.log("DATABASE_URL format check:", process.env.DATABASE_URL?.substring(0, 12));
console.log("DIRECT_URL format check:", process.env.DIRECT_URL?.substring(0, 12));

if (typeof window === 'undefined') {
  try {
    console.log("Initializing Magic SDK on server");
    Magic = require('@magic-sdk/admin').Magic;
    
    if (!process.env.MAGIC_SECRET_KEY) {
      console.error("MAGIC_SECRET_KEY is missing or empty!");
    } else {
      console.log("MAGIC_SECRET_KEY is configured [Key hidden]");
      magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
      console.log("Magic admin client initialized successfully");
    }
  } catch (error) {
    console.error("Failed to initialize Magic admin client:", error);
  }
}

import { db } from "@/lib/db";
import { sendWelcomeEmail } from "./emails/send-welcome";

// Log whether Prisma client is available
console.log("Prisma client initialized:", !!db);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as any),
  debug: process.env.NODE_ENV !== 'production',
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true", // Add error page for debugging
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
        try {
          console.log("Checking credentials");
          const didToken = credentials?.didToken;
          if (!didToken) {
            console.error("No DID token provided");
            throw new Error("No DID token provided");
          }
          console.log("DID token received [token hidden]");

          // Log database connection status before trying it
          try {
            console.log("Testing database connection");
            // Simple DB test to see if connection works
            const dbTest = await db.$queryRaw`SELECT 1 as test`;
            console.log("Database connection test result:", dbTest);
          } catch (dbError) {
            console.error("Database connection test failed:", dbError);
            // Continue with auth flow despite DB error
          }

          // Verify the token with Magic
          console.log("Validating Magic token");
          try {
            await magicAdmin.token.validate(didToken);
            console.log("Magic token validation successful");
          } catch (validationError) {
            console.error("Magic token validation failed:", validationError);
            throw validationError;
          }

          // Retrieve the user's email from the token
          console.log("Getting user metadata from Magic");
          let metadata;
          try {
            metadata = await magicAdmin.users.getMetadataByToken(didToken);
            console.log("User email from Magic:", metadata.email);
          } catch (metadataError) {
            console.error("Failed to get user metadata:", metadataError);
            throw metadataError;
          }

          // Find or create the user in your database
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
                  name: metadata.email.split('@')[0], // Default name
                },
              });
              console.log("New user created successfully:", user.id);
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
      console.log("Session callback called");
      if (token) {
        session!.user!.id = token.id;
        session!.user!.name = token.name;
        session!.user!.email = token.email;
        session!.user!.image = token.picture;
      }
      console.log("Session callback completed");
      return session;
    },
    async jwt({ token, user }) {
      console.log("JWT callback called");
      let dbUser;
      try {
        console.log("Looking up user for JWT:", token.email);
        dbUser = await db.user.findFirst({
          where: {
            email: token.email,
          },
        });
        console.log("JWT user lookup result:", dbUser ? "User found" : "User not found");
      } catch (error) {
        console.error("Error in JWT callback:", error);
        // If DB lookup fails, still return token with user info if available
        if (user) {
          console.log("Using provided user for JWT");
          token.id = user?.id;
        }
        console.log("JWT callback completed with error fallback");
        return token;
      }

      if (!dbUser) {
        if (user) {
          console.log("Using provided user for JWT");
          token.id = user?.id;
        }
        console.log("JWT callback completed (no DB user)");
        return token;
      }

      console.log("JWT callback completed with DB user");
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },
  events: {
    async signIn(message) {
      console.log("Sign in event:", message.user.email);
    },
    async signOut(message) {
      console.log("Sign out event:", message);
    },
    async createUser(message) {
      console.log("Create user event:", message.user.email);
      try {
        const params = {
          name: message.user.name,
          email: message.user.email,
        };
        await sendWelcomeEmail(params);
        console.log("Welcome email sent");
      } catch (error) {
        console.error("Failed to send welcome email:", error);
      }
    },
    async error(message) {
      console.error("Auth error event:", message);
    }
  },
};