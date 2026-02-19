import type {
  UnblockOrganizationParams,
  UnblockOrganizationResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { unblockOrganizationService } from "./service.js";

export const unblockOrganizationHandler = createActionHandler<
  UnblockOrganizationParams,
  UnblockOrganizationResponse
>("admin-organizations", unblockOrganizationService, "Organization");
