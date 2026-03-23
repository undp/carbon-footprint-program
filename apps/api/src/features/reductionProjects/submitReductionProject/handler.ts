import type {
  SubmitReductionProjectParams,
  SubmitReductionProjectResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { submitReductionProjectService } from "./service.js";

export const submitReductionProjectHandler = createActionHandler<
  SubmitReductionProjectParams,
  SubmitReductionProjectResponse
>(
  "reductionProjects",
  submitReductionProjectService,
  "Reduction project"
);
