import { z } from "zod";
import { IdSchema } from "../zod.js";

export const OrganizationBranchSchema = z
  .object({
    id: IdSchema.describe("The ID of the organization branch"),
    organizationId: IdSchema.describe("The ID of the organization"),
    name: z.string().describe("The name of the branch"),
  })
  .strict();
