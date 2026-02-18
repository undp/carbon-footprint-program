import { z } from "zod";
import { EntityReferenceSchema } from "../../baseSchemas.js";

// MyOrganizationsSelectorOptionsSchema
export const MyOrganizationsSelectorOptionsResponseSchema = z.array(
  EntityReferenceSchema
);
