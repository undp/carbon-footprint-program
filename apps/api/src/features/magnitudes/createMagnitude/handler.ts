import { createPostHandler } from "@/handlerFactory/index.js";
import { createMagnitudeService } from "./service.js";
import type { CreateMagnitudeBody, CreateMagnitudeResponse } from "@repo/types";

export const createMagnitudeHandler = createPostHandler<
  CreateMagnitudeBody,
  CreateMagnitudeResponse
>("magnitudes", createMagnitudeService, "Magnitude");
