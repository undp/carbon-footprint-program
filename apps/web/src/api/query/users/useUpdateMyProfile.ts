import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/http";
import { UpdateMyProfileBody, UpdateMyProfileResponse } from "@repo/types";
import { userKeys } from "./keys";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateMyProfileResponse, Error, UpdateMyProfileBody>({
    mutationFn: (data) => apiClient.patch("users/me", { json: data }).json(),
    // Refresh the cached current user so consumers react to the update
    // immediately.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.me }),
  });
};
