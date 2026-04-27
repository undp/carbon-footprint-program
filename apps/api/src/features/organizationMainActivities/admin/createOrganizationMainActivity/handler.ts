import { createPostHandler } from "@/handlerFactory/index.js";
import type {
  CreateOrganizationMainActivityRequest,
  CreateOrganizationMainActivityResponse,
} from "@repo/types";
import { createOrganizationMainActivityService } from "./service.js";

export const createOrganizationMainActivityHandler = createPostHandler<
  CreateOrganizationMainActivityRequest,
  CreateOrganizationMainActivityResponse
>(
  "admin-organization-main-activities",
  createOrganizationMainActivityService,
  "Organization main activity"
);
