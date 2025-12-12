import { z } from "zod";

export const GetAllCountrySectorsParamsSchema = z
  .void()
  .describe("No parameters required");

const CountrySubsectorSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of subsector"),
  name: z.string().min(1).describe("The name of subsector"),
});

export const GetAllCountrySectorsResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of sector"),
    name: z.string().min(1).describe("The name of sector"),
    subsectors: z.array(CountrySubsectorSchema),
  })
);

export type GetAllCountrySectorsResponse = z.infer<
  typeof GetAllCountrySectorsResponseSchema
>;
