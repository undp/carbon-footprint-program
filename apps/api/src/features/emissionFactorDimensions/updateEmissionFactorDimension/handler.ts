import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateEmissionFactorDimensionService } from "./service.js";
import type {
  UpdateEmissionFactorDimensionParams,
  UpdateEmissionFactorDimensionRequest,
  UpdateEmissionFactorDimensionResponse,
} from "@repo/types";

export const updateEmissionFactorDimensionHandler = createPatchHandler<
  UpdateEmissionFactorDimensionParams,
  UpdateEmissionFactorDimensionRequest,
  UpdateEmissionFactorDimensionResponse
>(
  "emissionFactorDimensions",
  updateEmissionFactorDimensionService,
  "EmissionFactorDimension"
);
