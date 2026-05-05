import { ReactNode } from "react";
import { Box } from "@mui/material";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

interface ProfilingMaintainerScreenLayoutProps {
  title: string;
  subtitle?: string;
  addLabel?: string;
  addDisabled?: boolean;
  onAddRow?: () => void;
  /** Status filter toggle (Activos / Eliminados / Todos) rendered in the header `extra` slot. */
  statusFilter?: ReactNode;
  /** React Hook Form instance providing FormProvider context to the children grid. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  /** Result of `useBlocker` for unsaved-changes guarding. */
  blockerStatus: "blocked" | "idle" | "proceeding";
  onBlockerProceed?: () => void;
  onBlockerReset?: () => void;
  /**
   * Slot for additional dialogs (e.g. the InUseWarningDialog) — kept outside the form
   * provider's children to make ownership explicit.
   */
  extraDialogs?: ReactNode;
  explanationSlug?: string;
  children: ReactNode;
}

/**
 * Dedicated layout for the four profiling maintainer screens (Rubros / Subrubros /
 * Actividades Principales / Tamaño de la Organización). Intentionally simpler than
 * `MaintainerScreenLayout`: there is no methodology scope, no view-only mode, no
 * EditModeToolbar / ExitEditModeDialog. Reuses `MaintainerPageHeader` (with the status
 * filter toggle in its `extra` slot) and `UnsavedChangesDialog` (for navigation blocker).
 */
export const ProfilingMaintainerScreenLayout = ({
  title,
  subtitle,
  addLabel = "Agregar",
  addDisabled,
  onAddRow,
  statusFilter,
  form,
  blockerStatus,
  onBlockerProceed,
  onBlockerReset,
  extraDialogs,
  explanationSlug,
  children,
}: ProfilingMaintainerScreenLayoutProps) => (
  <FormProvider {...form}>
    <MaintainerPageHeader
      title={title}
      subtitle={subtitle}
      addLabel={addLabel}
      addDisabled={addDisabled}
      onAddRow={onAddRow}
      extra={statusFilter}
      showDownload={false}
      explanationSlug={explanationSlug}
    />
    <Box className="rounded-sm bg-white p-3">
      <Box className="flex w-full">{children}</Box>
    </Box>
    <UnsavedChangesDialog
      open={blockerStatus === "blocked"}
      onCancel={() => onBlockerReset?.()}
      onConfirm={() => onBlockerProceed?.()}
    />
    {extraDialogs}
  </FormProvider>
);
