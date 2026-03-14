import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import {
  authSecret,
  githubAuthEnabled,
  googleAuthEnabled,
  isAuthConfigured,
} from "./runtime-config";

const providers = [];

if (googleAuthEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

if (githubAuthEnabled) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })
  );
}

// Edge-safe config (no Prisma/Node.js imports).
// Used by middleware and extended by lib/auth.ts.
export const authConfig = {
  providers,
  secret: authSecret ?? undefined,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth }) {
      if (!isAuthConfigured) {
        return true;
      }
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
