import { z } from "zod";
import { ConsideredGeiSchema } from "./schemas.js";

export type ConsideredGei = z.infer<typeof ConsideredGeiSchema>;
