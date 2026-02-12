import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateMethodologyService } from "./service.js";
import type {
  UpdateMethodologyParams,
  UpdateMethodologyRequest,
  UpdateMethodologyResponse,
} from "@repo/types";

export const updateMethodologyHandler = createPatchHandler<
  UpdateMethodologyParams,
  UpdateMethodologyRequest,
  UpdateMethodologyResponse
>("methodologies", updateMethodologyService, "Methodology");
