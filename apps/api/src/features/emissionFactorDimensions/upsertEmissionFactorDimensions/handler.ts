import { createPostHandler } from "@/handlerFactory/index.js";
import { upsertEmissionFactorDimensionsService } from "./service.js";
import type {
  UpsertEmissionFactorDimensionsRequest,
  UpsertEmissionFactorDimensionsResponse,
} from "@repo/types";

export const upsertEmissionFactorDimensionsHandler = createPostHandler<
  UpsertEmissionFactorDimensionsRequest,
  UpsertEmissionFactorDimensionsResponse
>(
  "emissionFactorDimensions",
  upsertEmissionFactorDimensionsService,
  "EmissionFactorDimension"
);
