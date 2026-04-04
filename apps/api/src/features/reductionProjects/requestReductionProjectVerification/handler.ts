import type { RequestReductionProjectVerificationParams } from "@repo/types";
import { createSubmissionRequestHandler } from "@/handlerFactory/index.js";
import { requestReductionProjectVerificationService } from "./service.js";

export const requestReductionProjectVerificationHandler =
  createSubmissionRequestHandler<
    RequestReductionProjectVerificationParams,
    void
  >(
    "reductionProjects",
    requestReductionProjectVerificationService,
    "ReductionProject"
  );
