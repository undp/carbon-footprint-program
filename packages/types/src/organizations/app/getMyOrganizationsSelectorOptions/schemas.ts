import { z } from "zod";
import { EntityReferenceSchema } from "../../baseSchemas.js";

// MyOrganizationsSelectorOptionsSchema
export const MyOrganizationsSelectorOptionsSchema = z.array(
  EntityReferenceSchema
);
