import { createPostHandler } from "@/handlerFactory/index.js";
import { createEmissionFactorService } from "./service.js";
import type {
  CreateEmissionFactorRequest,
  CreateEmissionFactorResponse,
} from "@repo/types";

export const createEmissionFactorHandler = createPostHandler<
  CreateEmissionFactorRequest,
  CreateEmissionFactorResponse
>("emissionFactors", createEmissionFactorService, "EmissionFactor");
