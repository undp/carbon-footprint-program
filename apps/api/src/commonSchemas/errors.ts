import { z } from "zod";

export const NotFoundErrorResponseSchema = z
  .object({
    message: z.string().describe("The error message"),
  })
  .describe("Not found error response");
