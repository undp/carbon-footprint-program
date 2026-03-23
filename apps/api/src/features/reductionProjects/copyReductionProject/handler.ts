import { createActionHandler } from "@/handlerFactory/createActionHandler.js";
import type { CopyReductionProjectParams } from "@repo/types";
import { copyReductionProjectService } from "./service.js";

export const copyReductionProjectHandler = createActionHandler<
  CopyReductionProjectParams,
  Awaited<ReturnType<typeof copyReductionProjectService>>
>("reductionProjects", copyReductionProjectService, "reduction project");
