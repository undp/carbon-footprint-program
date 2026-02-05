import { z } from "zod";
import type {
  GetUserByIdParamsSchema,
  GetUserByIdResponseSchema,
} from "./schemas.ts";

export type GetUserByIdParams = z.infer<typeof GetUserByIdParamsSchema>;

export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;
