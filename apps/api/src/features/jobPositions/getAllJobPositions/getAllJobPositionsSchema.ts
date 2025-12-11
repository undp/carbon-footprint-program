import { z } from "zod";

export const GetAllJobPositionsResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of job position"),
    name: z.string().min(1).describe("The name of job position"),
  })
);

export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
