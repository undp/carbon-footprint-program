import { z } from "zod";
import type { AdminListStatusFilterSchema } from "./schemas.js";

export type AdminListStatusFilter = z.infer<typeof AdminListStatusFilterSchema>;
