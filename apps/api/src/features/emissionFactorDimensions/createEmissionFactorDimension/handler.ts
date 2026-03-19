import { createPostHandler } from "@/handlerFactory/index.js";
import { createEmissionFactorDimensionService } from "./service.js";
import type {
  CreateEmissionFactorDimensionRequest,
  CreateEmissionFactorDimensionResponse,
} from "@repo/types";

export const createEmissionFactorDimensionHandler = createPostHandler<
  CreateEmissionFactorDimensionRequest,
  CreateEmissionFactorDimensionResponse
>(
  "emissionFactorDimensions",
  createEmissionFactorDimensionService,
  "EmissionFactorDimension"
);
