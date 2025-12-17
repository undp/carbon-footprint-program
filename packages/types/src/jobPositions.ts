import { z } from "zod";

export const JobPositionSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the job position"),
  name: z.string().min(1).describe("The name of the job position"),
});

export const GetAllJobPositionsResponseSchema = z.array(JobPositionSchema);

export type JobPosition = z.infer<typeof JobPositionSchema>;
export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
