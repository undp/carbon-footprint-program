import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateOrganizationMainActivityRequest,
  CreateOrganizationMainActivityResponse,
} from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateOrganizationMainActivityResponse,
    Error,
    CreateOrganizationMainActivityRequest
  >({
    mutationFn: (body) =>
      apiClient
        .post("admin/organization-main-activities", { json: body })
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationMainActivityKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: organizationMainActivityKeys.all,
      });
    },
  });
};
