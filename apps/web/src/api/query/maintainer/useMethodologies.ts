import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllMethodologiesResponse,
} from "@repo/types";

export const useMethodologies = () =>
  useQuery<GetAllMethodologiesResponse>({
    queryKey: maintainerKeys.methodologies.all,
    queryFn: () => apiClient.get("methodologies").json(),
    staleTime: STALE_TIME_MS,
  });

export const useUpdateMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<Methodology, Error, Methodology, { previous: Methodology[] | undefined }>({
    mutationFn: async (data) => {
      await new Promise((r) => setTimeout(r, 200));
      localData = localData.map((m) => (m.id === data.id ? data : m));
      return data;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: maintainerKeys.methodologies.all,
      });
      const previous = queryClient.getQueryData<Methodology[]>(
        maintainerKeys.methodologies.all
      );
      queryClient.setQueryData<Methodology[]>(
        maintainerKeys.methodologies.all,
        (old) => old?.map((m) => (m.id === data.id ? data : m)) ?? []
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          maintainerKeys.methodologies.all,
          context.previous
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
      });
    },
  });
};

export const useAddMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<Methodology, Error, Methodology>({
    mutationFn: async (data) => {
      await new Promise((r) => setTimeout(r, 200));
      localData = [...localData, data];
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
      });
    },
  });
};

export const useDeleteMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteMethodologyResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`methodologies/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
      });
    },
  });
};
