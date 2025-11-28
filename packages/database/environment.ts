export const NODE_ENV = process.env.NODE_ENV;

export const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  throw new Error(
    "[Database] DATABASE_URL is not defined in the environment variables"
  );
}
