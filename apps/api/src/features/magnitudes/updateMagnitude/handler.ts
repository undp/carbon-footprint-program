import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateMagnitudeService } from "./service.js";
import type {
  UpdateMagnitudeParams,
  UpdateMagnitudeBody,
  UpdateMagnitudeResponse,
} from "@repo/types";

export const updateMagnitudeHandler = createPatchHandler<
  UpdateMagnitudeParams,
  UpdateMagnitudeBody,
  UpdateMagnitudeResponse
>("magnitudes", updateMagnitudeService, "Magnitude");
