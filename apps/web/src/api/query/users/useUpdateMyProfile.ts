import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/api/http";
import { UpdateMyProfileBody, UpdateMyProfileResponse } from "@repo/types";

export const useUpdateMyProfile = () =>
  useMutation<UpdateMyProfileResponse, Error, UpdateMyProfileBody>({
    mutationFn: (data) => apiClient.patch("users/me", { json: data }).json(),
  });
