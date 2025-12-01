// Default value for development only - should never reach production
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const IS_PROD = process.env.NODE_ENV?.toLowerCase() === "production";

export const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (() => {
    if (IS_PROD) {
      throw new Error(
        "LOG_LEVEL environment variable is required in production"
      );
    }
    return "debug";
  })();

export const PORT = parseInt(process.env.API_PORT || "8080", 10);

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  (() => {
    if (IS_PROD) {
      throw new Error(
        "DATABASE_URL environment variable is required in production"
      );
    }
    return undefined;
  })();
