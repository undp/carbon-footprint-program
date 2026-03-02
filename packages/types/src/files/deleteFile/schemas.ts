import { z } from "zod";
import { FileBaseSchema } from "../../baseSchemas/index.js";

export const DeleteFileParamsSchema = FileBaseSchema.pick({ uuid: true });

export const DeleteFileResponseSchema = z
  .object({
    message: z.string().describe("Confirmation message"),
    uuid: z.uuid().describe("The UUID of the deleted file"),
  })
  .strict();
