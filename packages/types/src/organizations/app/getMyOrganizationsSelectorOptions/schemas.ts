import { z } from "zod";
import { EntityReferenceSchema } from "../../baseSchemas.js";

export const GetMyOrganizationsSelectorOptionsResponseSchema = z.array(
  EntityReferenceSchema
);
