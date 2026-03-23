import { z } from "zod";
import type { OrganizationBranchSchema } from "./baseSchemas.js";

export type OrganizationBranch = z.infer<typeof OrganizationBranchSchema>;
