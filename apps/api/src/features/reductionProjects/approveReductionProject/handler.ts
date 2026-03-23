import type {
  ApproveReductionProjectParams,
  ApproveReductionProjectResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { approveReductionProjectService } from "./service.js";

export const approveReductionProjectHandler = createActionHandler<
  ApproveReductionProjectParams,
  ApproveReductionProjectResponse
>(
  "reductionProjects",
  approveReductionProjectService,
  "Reduction project"
);
