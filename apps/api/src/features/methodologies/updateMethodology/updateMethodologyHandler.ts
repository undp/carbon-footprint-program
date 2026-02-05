import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateMethodologyService } from "./updateMethodologyService.js";
import type {
  UpdateMethodologyRequest,
  UpdateMethodologyResponse,
} from "@repo/types";

interface UpdateMethodologyParams {
  id: string;
}

export const updateMethodologyHandler = createPatchHandler<
  UpdateMethodologyParams,
  UpdateMethodologyRequest,
  UpdateMethodologyResponse
>("methodologies", updateMethodologyService, "Methodology");
