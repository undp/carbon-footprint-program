import { createActionHandler } from "@/handlerFactory/createActionHandler.js";
import type { CopyReductionProjectParams, CopyReductionProjectResponse } from "@repo/types";
import { copyReductionProjectService } from "./service.js";

export const copyReductionProjectHandler = createActionHandler<
  CopyReductionProjectParams,
  CopyReductionProjectResponse
>("reductionProjects", copyReductionProjectService, "Reduction project");
