import type {
  UpdateReductionProjectParams,
  UpdateReductionProjectBody,
  UpdateReductionProjectResponse,
} from "@repo/types";
import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateReductionProjectService } from "./service.js";

export const updateReductionProjectHandler = createPatchHandler<
  UpdateReductionProjectParams,
  UpdateReductionProjectBody,
  UpdateReductionProjectResponse
>(
  "reductionProjects",
  updateReductionProjectService,
  "Reduction project"
);
