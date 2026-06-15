import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteReductionProjectService } from "./service.js";
import { DeleteReductionProjectParams } from "@repo/types";

export const deleteReductionProjectHandler =
  createDeleteHandler<DeleteReductionProjectParams>(
    "reductionProjects",
    deleteReductionProjectService,
    "Reduction project"
  );
