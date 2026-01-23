import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Methodology } from "@/screens/Maintainer/types";
import { mockMethodologies } from "@/screens/Maintainer/mocks/methodologies.mock";
import { maintainerKeys } from "./keys";

let localData = [...mockMethodologies];

export const useMethodologies = () =>
  useQuery<Methodology[]>({
    queryKey: maintainerKeys.methodologies.all,
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return [...localData];
    },
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
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await new Promise((r) => setTimeout(r, 200));
      localData = localData.filter((m) => m.id !== id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
      });
    },
  });
};
