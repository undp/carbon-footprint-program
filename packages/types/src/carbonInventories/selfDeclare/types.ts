import { z } from "zod";
import type { SelfDeclareParamsSchema } from "./schemas.js";

export type SelfDeclareParams = z.infer<typeof SelfDeclareParamsSchema>;
