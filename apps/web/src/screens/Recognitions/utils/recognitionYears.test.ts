import { describe, expect, it } from "vitest";
import {
  GetOrganizationRecognitionsResponse,
  SubmissionType,
} from "@repo/types";
import { getRecognitionYears } from "./recognitionYears";

const recognition = (
  measurementYear: number,
  submissionType: GetOrganizationRecognitionsResponse[number]["submissionType"] = SubmissionType.CARBON_INVENTORY_CALCULATION
): GetOrganizationRecognitionsResponse[number] => ({
  submissionId: `${measurementYear}-${submissionType}`,
  earningDate: null,
  measurementYear,
  submissionType,
  totalEmissions: null,
  recognitionFileUrl: null,
});

describe("getRecognitionYears", () => {
  it("returns an empty list when there are no recognitions", () => {
    expect(getRecognitionYears([])).toEqual([]);
  });

  it("deduplicates years and sorts them newest first", () => {
    expect(
      getRecognitionYears([
        recognition(2025),
        recognition(2026),
        recognition(2025, SubmissionType.CARBON_INVENTORY_VERIFICATION),
      ])
    ).toEqual([2026, 2025]);
  });

  it("includes the years of reduction-project recognitions", () => {
    expect(
      getRecognitionYears([
        recognition(2025),
        recognition(2024, SubmissionType.REDUCTION_PROJECT_VERIFICATION),
      ])
    ).toEqual([2025, 2024]);
  });
});
