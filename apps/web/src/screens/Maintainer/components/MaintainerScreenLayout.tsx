import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { EditModeToolbar } from "./EditModeToolbar";
import { ExitEditModeDialog } from "./ExitEditModeDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { FormDebugPanel } from "@/devtools";
import { IS_DEVELOPMENT } from "@/config/environment";
import type { ScopedMethodologyContext } from "../hooks/useMaintainerMethodologyScope";

interface MaintainerScreenLayoutProps {
  title: string;
  addLabel?: string;
  scope: ScopedMethodologyContext;
  editingRowId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  formId: string;
  errorMessage: string | null;
  onAddRow?: () => void;
  addDisabled?: boolean;
  onExitEditMode: () => void;
  exitEditModeOpen: boolean;
  onExitEditModeOpenChange: (open: boolean) => void;
  blockerStatus: "blocked" | "idle" | "proceeding";
  onBlockerProceed?: () => void;
  onBlockerReset?: () => void;
  readOnlyDescription: string;
  editDescription: string;
  children: ReactNode;
  extraModals?: ReactNode;
}

export const MaintainerScreenLayout = ({
  title,
  addLabel = "Agregar fila",
  scope,
  editingRowId,
  form,
  formId,
  errorMessage,
  onAddRow,
  addDisabled,
  onExitEditMode,
  exitEditModeOpen,
  onExitEditModeOpenChange,
  blockerStatus,
  onBlockerProceed,
  onBlockerReset,
  readOnlyDescription,
  editDescription,
  children,
  extraModals,
}: MaintainerScreenLayoutProps) => {
  const {
    isViewOnly,
    isLoadingMethodologies,
    targetMethodology,
    methodologySelector,
  } = scope;

  if (!isLoadingMethodologies && errorMessage) {
    return (
      <>
        <MaintainerPageHeader
          title={title}
          addLabel={addLabel}
          addDisabled
          extra={methodologySelector}
        />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            {errorMessage}
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title={title}
        onAddRow={isViewOnly ? undefined : onAddRow}
        addDisabled={addDisabled}
        addLabel={addLabel}
        extra={methodologySelector}
      />
      <Box className="rounded-sm bg-white p-3">
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          {isViewOnly ? readOnlyDescription : editDescription}
        </Typography>
        <form id={formId} noValidate>
          <Box className="flex w-full">{children}</Box>
        </form>
      </Box>
      {!isViewOnly && (
        <EditModeToolbar
          methodologyName={targetMethodology?.name ?? ""}
          onExitClick={() => onExitEditModeOpenChange(true)}
        />
      )}
      <ExitEditModeDialog
        open={exitEditModeOpen}
        methodologyName={targetMethodology?.name ?? ""}
        hasUnsavedRow={editingRowId !== null}
        onClose={() => onExitEditModeOpenChange(false)}
        onConfirm={() => {
          onExitEditModeOpenChange(false);
          onExitEditMode();
        }}
      />
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={blockerStatus === "blocked"}
        onCancel={() => onBlockerReset?.()}
        onConfirm={() => onBlockerProceed?.()}
      />
      {extraModals}
    </FormProvider>
  );
};
