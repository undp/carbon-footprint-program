import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { EditModeToolbar, EDIT_MODE_TOOLBAR_HEIGHT } from "./EditModeToolbar";
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
  /**
   * Overrides `!scope.isViewOnly` for screens whose write permission is not the
   * shared one. Only the emission-factor screen passes it: the published
   * version is writable there, decided per factor by whether an active line
   * depends on it, while the other three screens stay read-only over it.
   */
  canEdit?: boolean;
  /** Qualifies the edit-mode toolbar, e.g. over the published methodology. */
  editModeNote?: string;
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
  explanationSlug?: string;
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
  canEdit: canEditOverride,
  editModeNote,
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
  explanationSlug,
}: MaintainerScreenLayoutProps) => {
  const {
    isViewOnly,
    isLoadingMethodologies,
    targetMethodology,
    methodologySelector,
    isEditingMethodology,
  } = scope;

  const canEdit = canEditOverride ?? !isViewOnly;

  // The toolbar carries the only "Salir de edición" there is, so it follows
  // edit mode rather than write permission. Over a published version three of
  // the four methodology screens are read-only by design, and gating on
  // `canEdit` used to leave them in edit mode with no way out and a disabled
  // selector — the route back was not reachable from where the user stood.
  const showEditModeToolbar = isEditingMethodology;
  const resolvedEditModeNote =
    editModeNote ??
    (canEdit
      ? undefined
      : "Esta pantalla es de solo lectura en la Metodología activa. Los Factores de emisión sí pueden editarse.");

  if (!isLoadingMethodologies && errorMessage) {
    return (
      <>
        <MaintainerPageHeader
          title={title}
          addLabel={addLabel}
          addDisabled
          extra={methodologySelector}
          explanationSlug={explanationSlug}
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
        subtitle={canEdit ? editDescription : readOnlyDescription}
        onAddRow={canEdit ? onAddRow : undefined}
        addDisabled={addDisabled}
        addLabel={addLabel}
        extra={methodologySelector}
        explanationSlug={explanationSlug}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={
          showEditModeToolbar
            ? { pb: `${EDIT_MODE_TOOLBAR_HEIGHT}px` }
            : undefined
        }
      >
        <form id={formId} noValidate>
          <Box className="flex w-full">{children}</Box>
        </form>
      </Box>
      {showEditModeToolbar && (
        <EditModeToolbar
          methodologyName={targetMethodology?.name ?? ""}
          note={resolvedEditModeNote}
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
