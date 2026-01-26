import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";

interface UseEmissionEditorCommentParams {
  subcategoryId: string;
}

export const useEmissionEditorComment = ({
  subcategoryId,
}: UseEmissionEditorCommentParams) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [currentRowId, setCurrentRowId] = useState<string>("");

  const { setValue } = useFormContext<EmissionCaptureFormValues>();

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

  // Save comment to the form and close dialog
  const saveComment = useCallback(() => {
    if (currentRowId) {
      setValue(
        `subcategories.${subcategoryId}.lines.${currentRowId}.comment`,
        currentComment || null,
        { shouldDirty: true }
      );
    }
    closeCommentDialog();
  }, [
    currentRowId,
    currentComment,
    subcategoryId,
    setValue,
    closeCommentDialog,
  ]);

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
