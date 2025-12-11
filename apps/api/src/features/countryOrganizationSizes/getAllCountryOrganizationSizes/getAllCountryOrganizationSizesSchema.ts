import { z } from "zod";

export const GetAllCountryOrganizationSizesParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllCountryOrganizationSizesResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of organization size"),
    name: z.string().min(1).describe("The name of organization size"),
  })
);

export type GetAllCountryOrganizationSizesResponse = z.infer<
  typeof GetAllCountryOrganizationSizesResponseSchema
>;
