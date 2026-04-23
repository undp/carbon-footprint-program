import { SubmissionQueryKey } from "../submissions";

export const requestsKeys = {
  adminAll: ["admin", "requests", "all"] as const,
  adminKpis: [
    "admin",
    "requests",
    "kpis",
    SubmissionQueryKey.SubmissionUpdateDependency,
  ] as const,
};
