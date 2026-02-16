import { z } from "zod";
import { EntityReferenceSchema } from "../../baseSchemas.js";

export const GetMyOrganizationsResponseSchema = z.array(EntityReferenceSchema);
