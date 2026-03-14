import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { isDatabaseAvailable } from "./runtime-config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(isDatabaseAvailable && prisma
    ? { adapter: PrismaAdapter(prisma) }
    : {}),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      } else if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
