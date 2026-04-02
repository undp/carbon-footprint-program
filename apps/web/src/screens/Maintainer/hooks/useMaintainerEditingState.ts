import { useCallback, useMemo, useState } from "react";

interface ModalState {
  open: boolean;
  rowIndex: number;
}

interface InternalModalState extends ModalState {
  methodologyVersionId?: string;
}

interface UseMaintainerEditingStateOptions {
  methodologyVersionId: string | undefined;
}

export const useMaintainerEditingState = ({
  methodologyVersionId,
}: UseMaintainerEditingStateOptions) => {
  // --- Editing row state scoped to methodology ---
  const [editingState, setEditingState] = useState<{
    methodologyVersionId?: string;
    rowId: string | null;
  }>({ methodologyVersionId: undefined, rowId: null });

  const editingRowId =
    editingState.methodologyVersionId === methodologyVersionId
      ? editingState.rowId
      : null;

  const setEditingRowId = useCallback(
    (rowId: string | null) => {
      setEditingState({ methodologyVersionId, rowId });
    },
    [methodologyVersionId]
  );

  // --- Exit edit mode dialog ---
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);

  // --- Methodology-scoped modal state ---
  const [internalModalState, setInternalModalState] =
    useState<InternalModalState>({
      methodologyVersionId: undefined,
      open: false,
      rowIndex: -1,
    });

  const modal: ModalState = useMemo(
    () =>
      internalModalState.methodologyVersionId === methodologyVersionId
        ? {
            open: internalModalState.open,
            rowIndex: internalModalState.rowIndex,
          }
        : { open: false, rowIndex: -1 },
    [internalModalState, methodologyVersionId]
  );

  const setModal = useCallback(
    (value: ModalState) => {
      setInternalModalState({ methodologyVersionId, ...value });
    },
    [methodologyVersionId]
  );

  // --- Utility ---
  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  return {
    editingRowId,
    setEditingRowId,
    exitEditModeOpen,
    setExitEditModeOpen,
    modal,
    setModal,
    isNewRow,
  };
};
