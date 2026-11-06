import { useQuery } from "@tanstack/react-query";
import {
  SubmissionType,
  GetOrganizationRecognitionsResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { organizationKeys } from "./keys";

export const useOrganizationRecognitions = (
  organizationId: string | undefined,
  submissionTypes?: SubmissionType[]
) =>
  useQuery<GetOrganizationRecognitionsResponse>({
    queryKey: organizationKeys.recognitions(
      organizationId ?? "",
      submissionTypes
    ),
    queryFn: async () =>
      apiClient
        .get(`app/organizations/${organizationId}/recognitions`, {
          searchParams:
            submissionTypes?.map((t) => ["submissionTypes", t]) ?? [],
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!organizationId,
  });
