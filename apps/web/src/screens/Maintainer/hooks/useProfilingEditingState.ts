import { useCallback, useState } from "react";

/**
 * Slim editing-state hook for the profiling maintainer screens (Sectors / Subsectors /
 * Main Activities / Organization Sizes). Unlike `useMaintainerEditingState`, there is no
 * methodology scope, no explanation modal, and no exit-edit dialog.
 */
export const useProfilingEditingState = () => {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);
  return { editingRowId, setEditingRowId, isNewRow };
};
