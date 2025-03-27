import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
let Magic: any;
let magicAdmin: any;

if (typeof window === 'undefined') {
  Magic = require('@magic-sdk/admin').Magic;
  magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
}

import { db } from "@/lib/db";
import { sendWelcomeEmail } from "./emails/send-welcome";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as any),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
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
        try {
          const didToken = credentials?.didToken;
          if (!didToken) throw new Error("No DID token provided");

          // Verify the token with Magic
          await magicAdmin.token.validate(didToken);

          // Retrieve the user's email from the token
          const metadata = await magicAdmin.users.getMetadataByToken(didToken);

          // Find or create the user in your database
          let user = await db.user.findFirst({
            where: { email: metadata.email },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: metadata.email,
                name: metadata.email.split('@')[0], // Default name
              },
            });
          }

          return user;
        } catch (error) {
          console.error("Magic Link authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session!.user!.id = token.id;
        session!.user!.name = token.name;
        session!.user!.email = token.email;
        session!.user!.image = token.picture;
      }

      return session;
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!dbUser) {
        if (user) {
          token.id = user?.id;
        }
        return token;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },
  events: {
    async createUser(message) {
      const params = {
        name: message.user.name,
        email: message.user.email,
      };
      await sendWelcomeEmail(params);
    },
  },
};