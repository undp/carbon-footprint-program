import { z } from "zod";
import {
  PaginationMetadataSchema,
  PaginationSortOrderSchema,
} from "./schemas.js";

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;
export type PaginationSortOrder = z.infer<typeof PaginationSortOrderSchema>;
