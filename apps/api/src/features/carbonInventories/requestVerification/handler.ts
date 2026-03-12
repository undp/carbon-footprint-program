import type { RequestVerificationParams } from "@repo/types";
import { createSubmissionRequestHandler } from "@/handlerFactory/index.js";
import { requestVerificationService } from "./service.js";

export const requestVerificationHandler = createSubmissionRequestHandler<
  RequestVerificationParams,
  void
>("carbonInventories", requestVerificationService, "CarbonInventory");
