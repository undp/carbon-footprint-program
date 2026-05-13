import { useCallback, useState } from "react";

interface ConfirmConfig {
  title: string;
  message: string;
  description?: string;
  variant?: "warning" | "error" | "info" | "success" | "primary";
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmDialogState {
  // Dialog state
  isOpen: boolean;

  // Content state
  title: string;
  message: string;
  description?: string;

  // Config state
  variant: "warning" | "error" | "info" | "success" | "primary";
  confirmLabel?: string;
  cancelLabel?: string;

  // Methods
  openConfirm: (config: ConfirmConfig) => void;
  closeConfirm: () => void;
}

/**
 * Manages confirm dialog UI state
 * Handles dialog open/close state and configuration
 */
export const useConfirmDialog = (): ConfirmDialogState => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig>({
    title: "",
    message: "",
    variant: "warning",
  });

  const openConfirm = useCallback((newConfig: ConfirmConfig) => {
    setConfig({ variant: "warning", ...newConfig });
    setIsOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    title: config.title,
    message: config.message,
    description: config.description,
    variant: config.variant || "warning",
    confirmLabel: config.confirmLabel,
    cancelLabel: config.cancelLabel,
    openConfirm,
    closeConfirm,
  };
};
