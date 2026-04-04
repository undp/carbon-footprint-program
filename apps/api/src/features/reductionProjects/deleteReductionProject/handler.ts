import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteReductionProjectService } from "./service.js";

export const deleteReductionProjectHandler = createDeleteHandler(
  "reductionProjects",
  deleteReductionProjectService,
  "Reduction project"
);
