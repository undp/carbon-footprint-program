import { useState, useCallback } from "react";
import { useCarbonInventoryState } from "../../../hooks/useCarbonInventoryState";

interface UseEmissionEditorCommentParams {
  subcategoryId: string;
}

export const useEmissionEditorComment = ({
  subcategoryId,
}: UseEmissionEditorCommentParams) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [currentRowId, setCurrentRowId] = useState<string>("");

  const updateLine = useCarbonInventoryState((state) => state.updateLine);

  // Open comment dialog for a specific row
  const openCommentDialog = useCallback((rowId: string, comment: string) => {
    setCurrentRowId(rowId);
    setCurrentComment(comment || "");
    setIsOpen(true);
  }, []);

  // Close comment dialog without saving
  const closeCommentDialog = useCallback(() => {
    setIsOpen(false);
    setCurrentComment("");
    setCurrentRowId("");
  }, []);

  // Save comment and close dialog
  const saveComment = useCallback(() => {
    if (currentRowId) {
      updateLine(subcategoryId, currentRowId, { comment: currentComment });
    }
    closeCommentDialog();
  }, [currentRowId, currentComment, subcategoryId, updateLine, closeCommentDialog]);

  // Props object for EmissionEditorCommentDialog
  const commentDialogProps = {
    open: isOpen,
    comment: currentComment,
    handleClose: closeCommentDialog,
    setComment: setCurrentComment,
    onSave: saveComment,
  };

  return {
    commentDialogProps,
    openCommentDialog,
  };
};
