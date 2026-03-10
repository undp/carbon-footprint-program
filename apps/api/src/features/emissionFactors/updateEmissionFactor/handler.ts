import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateEmissionFactorService } from "./service.js";
import type {
  UpdateEmissionFactorParams,
  UpdateEmissionFactorRequest,
  UpdateEmissionFactorResponse,
} from "@repo/types";

export const updateEmissionFactorHandler = createPatchHandler<
  UpdateEmissionFactorParams,
  UpdateEmissionFactorRequest,
  UpdateEmissionFactorResponse
>("emissionFactors", updateEmissionFactorService, "EmissionFactor");
