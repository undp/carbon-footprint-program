import { createPostHandler } from "@/handlerFactory/index.js";
import { createReductionProjectService } from "./service.js";
import type {
  CreateReductionProjectRequest,
  CreateReductionProjectResponse,
} from "@repo/types";

export const createReductionProjectHandler = createPostHandler<
  CreateReductionProjectRequest,
  CreateReductionProjectResponse
>("reductionProjects", createReductionProjectService, "Reduction project");
