import { useCallback, useState } from "react";
import {
  useUpdateMethodology,
  useAddMethodology,
  useDeleteMethodology,
} from "@/api/query/maintainer";
import type { Methodology } from "../types";

interface MethodologyDiff {
  toAdd: Methodology[];
  toUpdate: Methodology[];
  toDelete: string[];
}

const computeMethodologyDiff = (
  current: Methodology[],
  original: Methodology[]
): MethodologyDiff => {
  const originalMap = new Map(original.map((m) => [m.id, m]));
  const currentIds = new Set(current.map((m) => m.id));

  const toAdd: Methodology[] = [];
  const toUpdate: Methodology[] = [];
  const toDelete: string[] = [];

  for (const item of current) {
    const orig = originalMap.get(item.id);
    if (!orig) {
      toAdd.push(item);
    } else if (JSON.stringify(orig) !== JSON.stringify(item)) {
      toUpdate.push(item);
    }
  }

  for (const orig of original) {
    if (!currentIds.has(orig.id)) {
      toDelete.push(orig.id);
    }
  }

  return { toAdd, toUpdate, toDelete };
};

export const useSaveMethodologies = () => {
  const updateMutation = useUpdateMethodology();
  const addMutation = useAddMethodology();
  const deleteMutation = useDeleteMethodology();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (current: Methodology[], original: Methodology[]) => {
      const { toAdd, toUpdate, toDelete } = computeMethodologyDiff(
        current,
        original
      );

      setIsSaving(true);
      try {
        const promises: Promise<unknown>[] = [];
        for (const item of toAdd) {
          promises.push(addMutation.mutateAsync(item));
        }
        for (const item of toUpdate) {
          promises.push(updateMutation.mutateAsync(item));
        }
        for (const id of toDelete) {
          promises.push(deleteMutation.mutateAsync(id));
        }
        await Promise.all(promises);
      } finally {
        setIsSaving(false);
      }
    },
    [addMutation, updateMutation, deleteMutation]
  );

  return { save, isSaving };
};
