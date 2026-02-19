import type {
  BlockOrganizationParams,
  BlockOrganizationResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { blockOrganizationService } from "./service.js";

export const blockOrganizationHandler = createActionHandler<
  BlockOrganizationParams,
  BlockOrganizationResponse
>("admin-organizations", blockOrganizationService, "Organization");
