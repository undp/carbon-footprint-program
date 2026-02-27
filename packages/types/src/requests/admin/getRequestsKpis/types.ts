import { z } from "zod";
import { GetAdminRequestsKpisResponseSchema } from "./schemas.js";

export type GetAdminRequestsKpisResponse = z.infer<
  typeof GetAdminRequestsKpisResponseSchema
>;
