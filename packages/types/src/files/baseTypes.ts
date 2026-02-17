import { z } from "zod";
import type { FileSchema } from "./baseSchemas.ts";

export type File = z.infer<typeof FileSchema>;
