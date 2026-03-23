import { z } from "zod";
import type {
  AddReductionProjectDocumentParamsSchema,
  AddReductionProjectDocumentBodySchema,
  AddReductionProjectDocumentResponseSchema,
} from "./schemas.js";

export type AddReductionProjectDocumentParams = z.infer<
  typeof AddReductionProjectDocumentParamsSchema
>;

export type AddReductionProjectDocumentBody = z.infer<
  typeof AddReductionProjectDocumentBodySchema
>;

export type AddReductionProjectDocumentResponse = z.infer<
  typeof AddReductionProjectDocumentResponseSchema
>;
