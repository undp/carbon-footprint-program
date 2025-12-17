// Default value for development only - should never reach production
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const IS_PROD = process.env.NODE_ENV?.toLowerCase() === "production";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

export const HOST = process.env.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
export const PORT = parseInt(process.env.API_PORT ?? "8080", 10);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
export const DATABASE_URL = process.env.DATABASE_URL;
