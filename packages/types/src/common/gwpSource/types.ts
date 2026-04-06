import { z } from "zod";
import { GwpSourceSchema } from "./schemas.js";

export type GwpSource = z.infer<typeof GwpSourceSchema>;
