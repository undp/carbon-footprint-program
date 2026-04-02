import { useCallback } from "react";
import type { GetAllMethodologiesResponse } from "@repo/types";
import type { MaintainerState } from "../types";

interface UseMaintainerExitEditModeOptions {
  editingRowId: string | null;
  handleCancelEditRow: () => void;
  effectiveMethodologyId: string | undefined;
  methodologies: GetAllMethodologiesResponse;
  selectMethodology: MaintainerState["selectMethodology"];
  stopEditing: MaintainerState["stopEditing"];
}

export const useMaintainerExitEditMode = ({
  editingRowId,
  handleCancelEditRow,
  effectiveMethodologyId,
  methodologies,
  selectMethodology,
  stopEditing,
}: UseMaintainerExitEditModeOptions) => {
  const handleExitEditModeNav = useCallback(() => {
    const target = methodologies.find((m) => m.id === effectiveMethodologyId);
    if (target) {
      selectMethodology({
        id: target.id,
        name: target.name,
        regulation: target.regulation,
      });
    } else {
      stopEditing();
    }
  }, [effectiveMethodologyId, methodologies, selectMethodology, stopEditing]);

  const handleExitEditMode = useCallback(() => {
    if (editingRowId) handleCancelEditRow();
    handleExitEditModeNav();
  }, [editingRowId, handleCancelEditRow, handleExitEditModeNav]);

  return { handleExitEditMode };
};
