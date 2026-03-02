import { z } from "zod";
import {
  OrganizationBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../../baseSchemas/index.js";

export const GetMyOrganizationsSelectorOptionsResponseSchema = z.array(
  z.object({
    id: OrganizationBaseSchema.shape.id.describe("The organization ID"),
    name: OrganizationSummaryBaseSchema.shape.name.describe(
      "The organization name"
    ),
  })
);
