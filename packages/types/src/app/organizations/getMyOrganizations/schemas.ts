import { z } from "zod";
import { OrganizationListItemSchema } from "../../../organizations/schemas.js";

// Response schema
export const GetMyOrganizationsResponseSchema = z.array(
  OrganizationListItemSchema
);
