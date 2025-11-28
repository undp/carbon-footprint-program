import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get the directory of the current file (works in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the database package directory
config({ path: resolve(__dirname, ".env") });

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
export const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
export const IS_PROD = process.env.NODE_ENV === "production";
