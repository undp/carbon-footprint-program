import { useState } from "react";
import type { GetMeResponse } from "@repo/types";
import { EXIT_DIALOG_CONTENT } from "../constants";

interface UseExitDialogOptions {
  user: GetMeResponse | undefined;
  onUserExit: () => void;
  onGuestConfirm: () => void;
}

export const useExitDialog = ({
  user,
  onUserExit,
  onGuestConfirm,
}: UseExitDialogOptions) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExitClick = () => {
    if (user) {
      onUserExit();
    } else {
      setIsOpen(true);
    }
  };

  const dialogProps = {
    open: isOpen,
    onClose: () => setIsOpen(false),
    onConfirm: onGuestConfirm,
    ...EXIT_DIALOG_CONTENT.GUEST,
  };

  return { handleExitClick, dialogProps };
};
