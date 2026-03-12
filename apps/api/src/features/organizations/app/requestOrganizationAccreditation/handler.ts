import type {
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationResponse,
} from "@repo/types";
import { createSubmissionRequestHandler } from "@/handlerFactory/index.js";
import { requestOrganizationAccreditationService } from "./service.js";

export const requestOrganizationAccreditationHandler =
  createSubmissionRequestHandler<
    RequestOrganizationAccreditationParams,
    RequestOrganizationAccreditationResponse
  >(
    "app-organizations",
    requestOrganizationAccreditationService,
    "Organization"
  );
