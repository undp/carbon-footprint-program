import { createActionHandler } from "@/handlerFactory/index.js";
import { duplicateCarbonInventoryService } from "./service.js";
import type {
  DuplicateCarbonInventoryParams,
  DuplicateCarbonInventoryResponse,
} from "@repo/types";

export const duplicateCarbonInventoryHandler = createActionHandler<
  DuplicateCarbonInventoryParams,
  DuplicateCarbonInventoryResponse
>("carbonInventories", duplicateCarbonInventoryService, "Carbon inventory");
