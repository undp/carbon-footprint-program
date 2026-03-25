import { z } from "zod";
import { IconNameSchema } from "./schemas.js";

export type IconName = z.infer<typeof IconNameSchema>;
