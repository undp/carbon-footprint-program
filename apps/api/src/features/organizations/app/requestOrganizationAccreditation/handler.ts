import type {
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { requestOrganizationAccreditationService } from "./service.js";

export const requestOrganizationAccreditationHandler = createActionHandler<
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationResponse
>("app-organizations", requestOrganizationAccreditationService, "Organization");
