import { createDeleteHandler } from "@/handlerFactory/createDeleteHandler.js";
import type { DeleteReductionProjectParams } from "@repo/types";
import { deleteReductionProjectService } from "./service.js";

export const deleteReductionProjectHandler = createDeleteHandler<DeleteReductionProjectParams>(
  "reductionProjects",
  deleteReductionProjectService,
  "reduction project"
);
