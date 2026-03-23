import type {
  CreateReductionProjectBody,
  CreateReductionProjectResponse,
} from "@repo/types";
import { createPostHandler } from "@/handlerFactory/index.js";
import { createReductionProjectService } from "./service.js";

export const createReductionProjectHandler = createPostHandler<
  CreateReductionProjectBody,
  CreateReductionProjectResponse
>(
  "reductionProjects",
  createReductionProjectService,
  "Reduction project"
);
