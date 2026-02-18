import { createPostHandler } from "@/handlerFactory/index.js";
import { swapCategoryPositionsService } from "./service.js";
import type {
  SwapCategoryPositionsRequest,
  SwapCategoryPositionsResponse,
} from "@repo/types";

export const swapCategoryPositionsHandler = createPostHandler<
  SwapCategoryPositionsRequest,
  SwapCategoryPositionsResponse
>("categories", swapCategoryPositionsService, "CategoryPositions");
