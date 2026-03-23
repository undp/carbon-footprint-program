import type {
  ReopenReductionProjectParams,
  ReopenReductionProjectResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { reopenReductionProjectService } from "./service.js";

export const reopenReductionProjectHandler = createActionHandler<
  ReopenReductionProjectParams,
  ReopenReductionProjectResponse
>(
  "reductionProjects",
  reopenReductionProjectService,
  "Reduction project"
);
