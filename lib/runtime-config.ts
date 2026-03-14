const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isFileDatabase = databaseUrl.startsWith("file:");

export const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || null;

export const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const githubAuthEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

export const hasAuthProviders = googleAuthEnabled || githubAuthEnabled;

export const isAuthConfigured = Boolean(authSecret && hasAuthProviders);

// Vercel's filesystem is not suitable for a local SQLite file in production.
export const isDatabaseAvailable = !(
  process.env.VERCEL && process.env.NODE_ENV === "production" && isFileDatabase
);
