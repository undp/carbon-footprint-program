import { z } from "zod";
import { FileSchema } from "../baseSchemas.js";

export const DeleteFileParamsSchema = FileSchema.pick({ uuid: true });

export const DeleteFileResponseSchema = z
  .object({
    message: z.string().describe("Confirmation message"),
    uuid: z.uuid().describe("The UUID of the deleted file"),
  })
  .strict();
