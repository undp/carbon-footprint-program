import { z } from "zod";
import type { CategorySchema } from "./baseSchemas.js";

// TypeScript Types
export type Category = z.infer<typeof CategorySchema>;
