import { z } from "zod";
import { PaginationMetadataSchema } from "./schemas.js";

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;
