import { z } from "zod";
import { GetAllAdminRequestsResponseSchema } from "./schemas.js";

export type GetAllAdminRequestsResponse = z.infer<
  typeof GetAllAdminRequestsResponseSchema
>;
