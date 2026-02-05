import { z } from "zod";
import type { UserSchema } from "./baseSchemas.ts";

export type User = z.infer<typeof UserSchema>;
