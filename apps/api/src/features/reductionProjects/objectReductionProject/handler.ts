import { createActionHandler } from "@/handlerFactory/createActionHandler.js";
import type { ObjectReductionProjectParams } from "@repo/types";
import { objectReductionProjectService } from "./service.js";

export const objectReductionProjectHandler = createActionHandler<
  ObjectReductionProjectParams,
  Awaited<ReturnType<typeof objectReductionProjectService>>
>("reductionProjects", objectReductionProjectService, "reduction project");
