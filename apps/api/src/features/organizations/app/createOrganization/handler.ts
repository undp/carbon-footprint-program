import type {
  CreateOrganizationBody,
  CreateOrganizationResponse,
} from "@repo/types";
import { createPostHandler } from "@/handlerFactory/createPostHandler.js";
import { createOrganizationService } from "./service.js";

export const createOrganizationHandler = createPostHandler<
  CreateOrganizationBody,
  CreateOrganizationResponse
>("app-organizations", createOrganizationService, "organization");
