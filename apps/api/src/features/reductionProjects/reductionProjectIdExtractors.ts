import type { ReductionProjectIdExtractor } from "@/plugins/app/reductionProjectAuthorizationPlugin.js";

export const extractReductionProjectIdFromParams: ReductionProjectIdExtractor =
  (request) => request.params.id;
