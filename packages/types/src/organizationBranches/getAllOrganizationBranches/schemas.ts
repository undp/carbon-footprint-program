import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { OrganizationBranchSchema } from "../baseSchemas.js";

export const GetAllOrganizationBranchesQuerySchema = z.object({
  organizationId: IdSchema.describe("The ID of the organization"),
});

export const GetAllOrganizationBranchesResponseSchema = z.array(
  OrganizationBranchSchema
);
