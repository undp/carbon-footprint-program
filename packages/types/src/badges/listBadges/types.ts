import { z } from "zod";
import { ListBadgesResponseSchema } from "./schemas.js";

export type ListBadgesResponse = z.infer<typeof ListBadgesResponseSchema>;
