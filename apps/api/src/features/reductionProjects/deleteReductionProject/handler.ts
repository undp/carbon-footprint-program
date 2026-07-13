import { createDeleteHandler } from "@/handlerFactory/index.js";
import { DeleteReductionProjectParams } from "@repo/types";
import { deleteReductionProjectService } from "./service.js";

export const deleteReductionProjectHandler =
  createDeleteHandler<DeleteReductionProjectParams>(
    "reductionProjects",
    deleteReductionProjectService,
    "Reduction project"
  );
