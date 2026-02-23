import { z } from "zod";
import {
  BasePaginatedResponseSchema,
  BasePaginationQuerySchema,
} from "./schemas.js";

export type BasePaginatedResponse = z.infer<typeof BasePaginatedResponseSchema>;

export type BasePaginationQuery = z.infer<typeof BasePaginationQuerySchema>;
