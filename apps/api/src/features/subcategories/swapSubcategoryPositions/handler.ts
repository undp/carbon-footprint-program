import { createPostHandler } from "@/handlerFactory/index.js";
import { swapSubcategoryPositionsService } from "./service.js";
import type {
  SwapSubcategoryPositionsRequest,
  SwapSubcategoryPositionsResponse,
} from "@repo/types";

export const swapSubcategoryPositionsHandler = createPostHandler<
  SwapSubcategoryPositionsRequest,
  SwapSubcategoryPositionsResponse
>("subcategories", swapSubcategoryPositionsService, "SubcategoryPositions");
