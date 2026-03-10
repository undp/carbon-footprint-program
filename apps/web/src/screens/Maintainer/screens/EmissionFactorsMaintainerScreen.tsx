import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useMethodologies,
  useSubcategories,
  useEmissionFactors,
  useAddEmissionFactor,
  useUpdateEmissionFactor,
  useDeleteEmissionFactor,
} from "@/api/query/maintainer";
import { useRateMeasurementUnits } from "@/api/query/measurementUnits/useRateMeasurementUnits";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import {
  useEmissionFactorsForm,
  toFormEmissionFactor,
} from "../hooks/useEmissionFactorsForm";
import { useEmissionFactorColumns } from "../hooks/useEmissionFactorColumns";
import {
  MethodologyVersionStatus,
  type EmissionFactorForm,
  type GetAllEmissionFactorsResponse,
} from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { InfoBanner } from "../components/InfoBanner";
import { GEIBreakdownModal } from "../components/GEIBreakdownModal";

type EmissionFactor = GetAllEmissionFactorsResponse[number];

/**
 * Outer wrapper: data fetching + deferred form mount.
 */
export const EmissionFactorsMaintainerScreen: FC = () => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const selectedMethodology = useMaintainerStore((s) => s.selectedMethodology);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const { data: methodologies = [] } = useMethodologies();

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const effectiveMethodologyId =
    editingMethodology?.id ?? selectedMethodology?.id ?? activeMethodology?.id;

  const handleExitEditMode = useCallback(() => {
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

  const targetMethodology = methodologies.find(
    (m) => m.id === effectiveMethodologyId
  );
  const methodologyVersionId = targetMethodology?.id;

  const isViewOnly =
    !editingMethodology ||
    targetMethodology?.status === MethodologyVersionStatus.PUBLISHED;

  const methodologySelector = (
    <Box className="flex items-center gap-1">
      <Typography variant="body2" color="text.secondary" noWrap>
        Metodología:
      </Typography>
      <Select
        size="small"
        value={effectiveMethodologyId ?? ""}
        disabled={!!editingMethodology}
        onChange={(e) => {
          const m = methodologies.find((m) => m.id === e.target.value);
          if (m)
            selectMethodology({
              id: m.id,
              name: m.name,
              regulation: m.regulation,
            });
        }}
        sx={{ minWidth: 220 }}
      >
        {methodologies.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const { data: emissionFactors, isLoading: isLoadingEFs } =
    useEmissionFactors(methodologyVersionId);
  const { data: subcategories, isLoading: isLoadingSubs } =
    useSubcategories(methodologyVersionId);
  const { data: rateUnits, isLoading: isLoadingUnits } =
    useRateMeasurementUnits();
  if (!targetMethodology) return null;

  if (
    isLoadingEFs ||
    !emissionFactors ||
    isLoadingSubs ||
    !subcategories ||
    isLoadingUnits ||
    !rateUnits
  ) {
    return (
      <>
        <MaintainerPageHeader
          title="Factores de emisión"
          addLabel="Agregar fila"
          addDisabled
          extra={methodologySelector}
        />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            Cargando factores de emisión…
          </Typography>
        </Box>
      </>
    );
  }

  const subcategoryOptions = subcategories.map((s) => ({
    id: s.id,
    name: s.name,
    measurementUnitIds: s.measurementUnits.map((mu) => mu.id),
  }));

  const rateUnitOptions = rateUnits.map((u) => ({
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation,
    denominatorUnitId: u.denominatorUnit.id,
  }));

  return (
    <EmissionFactorsForm
      key={methodologyVersionId}
      targetMethodology={targetMethodology}
      methodologyVersionId={methodologyVersionId!}
      isViewOnly={isViewOnly}
      initialEmissionFactors={emissionFactors.map(toFormEmissionFactor)}
      serverEmissionFactors={emissionFactors}
      subcategories={subcategoryOptions}
      rateUnits={rateUnitOptions}
      methodologySelector={methodologySelector}
      onExitEditMode={handleExitEditMode}
    />
  );
};

// ---------------------------------------------------------------------------

interface EmissionFactorsFormProps {
  targetMethodology: { id: string; name: string };
  methodologyVersionId: string;
  isViewOnly: boolean;
  initialEmissionFactors: EmissionFactorForm[];
  serverEmissionFactors: GetAllEmissionFactorsResponse;
  subcategories: Array<{
    id: string;
    name: string;
    measurementUnitIds: string[];
  }>;
  rateUnits: Array<{
    id: string;
    name: string;
    abbreviation: string;
    denominatorUnitId: string;
  }>;
  methodologySelector: ReactNode;
  onExitEditMode: () => void;
}

const EmissionFactorsForm: FC<EmissionFactorsFormProps> = ({
  targetMethodology,
  methodologyVersionId,
  isViewOnly,
  initialEmissionFactors,
  serverEmissionFactors,
  subcategories,
  rateUnits,
  methodologySelector,
  onExitEditMode,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [geiModal, setGeiModal] = useState<{
    open: boolean;
    rowIndex: number;
  }>({ open: false, rowIndex: -1 });

  const addMutation = useAddEmissionFactor(methodologyVersionId);
  const updateMutation = useUpdateEmissionFactor(methodologyVersionId);
  const deleteMutation = useDeleteEmissionFactor(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useEmissionFactorsForm(
    initialEmissionFactors
  );
  const currentRows = form.watch("emissionFactors");

  // Sync form when server data changes (e.g. after a delete).
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);
  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    form.reset({
      emissionFactors: serverEmissionFactors.map(toFormEmissionFactor),
    });
  }, [serverEmissionFactors, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("emissionFactors");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`emissionFactors.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (row && isNewRow(row.id)) {
      try {
        const result = await addMutation.mutateAsync({
          subcategoryId: row.subcategoryId,
          dimensionValue1Name: row.dimensionValue1Name || null,
          dimensionValue2Name: row.dimensionValue2Name || null,
          rateMeasurementUnitId: row.rateMeasurementUnitId,
          source: row.source,
          gasDetails: row.gasDetails,
          value: row.value,
        });
        fieldArray.update(rowIndex, toFormEmissionFactor(result));
        form.reset({ emissionFactors: form.getValues("emissionFactors") });
        void enqueueSnackbar({
          message: "Factor de emisión creado exitosamente",
          variant: "success",
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al crear factor de emisión",
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const serverRow = serverEmissionFactors.find(
      ({ id }) => id === editingRowId
    );
    const original = serverRow ? toFormEmissionFactor(serverRow) : null;
    const hasRealChanges =
      row &&
      (!original ||
        row.subcategoryId !== original.subcategoryId ||
        row.dimensionValue1Name !== original.dimensionValue1Name ||
        row.dimensionValue2Name !== original.dimensionValue2Name ||
        row.rateMeasurementUnitId !== original.rateMeasurementUnitId ||
        row.source !== original.source ||
        row.value !== original.value ||
        JSON.stringify(row.gasDetails) !== JSON.stringify(original.gasDetails));

    try {
      if (row && hasRealChanges) {
        await updateMutation.mutateAsync({
          emissionFactorId: row.id,
          data: {
            subcategoryId: row.subcategoryId,
            dimensionValue1Name: row.dimensionValue1Name || null,
            dimensionValue2Name: row.dimensionValue2Name || null,
            rateMeasurementUnitId: row.rateMeasurementUnitId,
            source: row.source,
            gasDetails: row.gasDetails,
            value: row.value,
          },
        });
        form.reset({ emissionFactors: form.getValues("emissionFactors") });
        void enqueueSnackbar({
          message: "Cambios guardados satisfactoriamente",
          variant: "success",
        });
      }
    } catch {
      void enqueueSnackbar({
        message: "Error al guardar cambios",
        variant: "error",
      });
      return false;
    }
    setEditingRowId(null);
    return true;
  }, [
    editingRowId,
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
    serverEmissionFactors,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("emissionFactors");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = serverEmissionFactors.find(
        ({ id }) => id === editingRowId
      );
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormEmissionFactor(original));
      }
    }

    form.reset({ emissionFactors: form.getValues("emissionFactors") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, serverEmissionFactors]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const success = await handleStopEditRow();
        if (!success) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const currentCount = form.getValues("emissionFactors").length;
    const totalAfterAppend = currentCount + 1;
    const lastPage = Math.max(
      0,
      Math.ceil(totalAfterAppend / paginationModel.pageSize) - 1
    );

    const newRow: EmissionFactorForm = {
      id: tempId,
      subcategoryId: "",
      dimensionValue1Name: null,
      dimensionValue2Name: null,
      rateMeasurementUnitId: "",
      source: "",
      value: 0,
      gasDetails: {
        CO2_FOSSIL: 0,
        CH4: 0,
        N2O: 0,
        HFC: 0,
        PFC: 0,
        SF6: 0,
        NF3: 0,
      },
    };
    fieldArray.append(newRow);
    setPaginationModel((prev) => ({ ...prev, page: lastPage }));
    setEditingRowId(tempId);
  }, [fieldArray, form, paginationModel.pageSize]);

  const handleDelete = useCallback(
    async (row: EmissionFactorForm) => {
      try {
        const rows = form.getValues("emissionFactors");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ emissionFactors: form.getValues("emissionFactors") });
          void enqueueSnackbar({
            message: "Factor de emisión eliminado",
            variant: "success",
          });
        }
      } catch {
        void enqueueSnackbar({
          message: "Error al eliminar factor de emisión",
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, isNewRow, deleteMutation, enqueueSnackbar]
  );

  const handleExitEditMode = useCallback(() => {
    if (editingRowId) handleCancelEditRow();
    onExitEditMode();
  }, [editingRowId, handleCancelEditRow, onExitEditMode]);

  // --- GEI Breakdown Modal ---
  const handleOpenGEIBreakdown = useCallback((rowIndex: number) => {
    setGeiModal({ open: true, rowIndex });
  }, []);

  const handleSaveGEIBreakdown = useCallback(
    (gasDetails: EmissionFactorForm["gasDetails"]) => {
      const { rowIndex } = geiModal;
      if (rowIndex < 0) return;
      handleCellChange(rowIndex, "gasDetails", gasDetails);

      // Auto-save for existing rows
      const row = form.getValues(`emissionFactors.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        void updateMutation
          .mutateAsync({
            emissionFactorId: row.id,
            data: { gasDetails },
          })
          .then(() => {
            form.reset({
              emissionFactors: form.getValues("emissionFactors"),
            });
            void enqueueSnackbar({
              message: "Desglose GEI guardado",
              variant: "success",
            });
          })
          .catch(() => {
            void enqueueSnackbar({
              message: "Error al guardar desglose GEI",
              variant: "error",
            });
          });
      }
    },
    [
      geiModal,
      handleCellChange,
      form,
      isNewRow,
      updateMutation,
      enqueueSnackbar,
    ]
  );

  // --- Block navigation while editing ---
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => editingRowId !== null,
    withResolver: true,
  });

  // --- Column definitions ---
  const columns = useEmissionFactorColumns({
    editingRowId,
    viewOnly: isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenGEIBreakdown: handleOpenGEIBreakdown,
    rows: currentRows,
    subcategories,
    rateUnits,
  });

  const geiGasDetails =
    geiModal.rowIndex >= 0
      ? form.getValues(`emissionFactors.${geiModal.rowIndex}.gasDetails`)
      : undefined;

  const geiDeclaredValue =
    geiModal.rowIndex >= 0
      ? form.getValues(`emissionFactors.${geiModal.rowIndex}.value`)
      : 0;

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Factores de emisión"
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        extra={methodologySelector}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={!isViewOnly ? { pb: 8 } : undefined}
      >
        {!isViewOnly && (
          <InfoBanner
            variant="success"
            title={`Editando metodología: ${targetMethodology.name}`}
            subtitle="Los cambios se aplicarán automáticamente"
          />
        )}
        <Box
          sx={{
            m: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {isViewOnly
              ? "Vista de solo lectura de los factores de emisión de esta metodología."
              : "Gestiona los factores de emisión. Haz clic en una fila para editarla."}
          </Typography>
        </Box>
        <form id="emission-factors-form" noValidate>
          <Box className="flex w-full">
            <StylizedDataGrid
              sx={(theme) => ({
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: theme.palette.grey[200],
                },
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiDataGrid-cell .MuiOutlinedInput-root": {
                  backgroundColor: theme.palette.common.white,
                },
                "& .MuiDataGrid-cell .MuiSelect-select": {
                  backgroundColor: theme.palette.common.white,
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              columns={columns}
              rows={currentRows}
              getRowHeight={() => 60}
              getRowId={(row: EmissionFactor) => row.id}
              getRowClassName={({ id }) =>
                String(id) === editingRowId ? "row--editing" : ""
              }
              hideFooter={false}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
            />
          </Box>
        </form>
      </Box>
      {!isViewOnly && (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 4,
            py: 1.5,
            zIndex: 1200,
            borderTop: "2px solid",
            borderColor: "success.main",
          }}
        >
          <DotIcon sx={{ fontSize: 12, color: "success.main" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Editando: {targetMethodology.name}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => setExitEditModeOpen(true)}
          >
            Salir de modo edición
          </Button>
        </Paper>
      )}
      <Dialog
        open={exitEditModeOpen}
        onClose={() => setExitEditModeOpen(false)}
      >
        <DialogTitle>Salir de modo edición</DialogTitle>
        <DialogContent>
          {editingRowId ? (
            <DialogContentText>
              Tienes cambios sin guardar en la fila que estás editando. Si sales
              del modo edición, los cambios se perderán.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Estás a punto de salir del modo edición de{" "}
              <strong>{targetMethodology.name}</strong>. Podrás volver a
              editarla desde la pantalla de Metodologías.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitEditModeOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setExitEditModeOpen(false);
              handleExitEditMode();
            }}
          >
            {editingRowId ? "Salir sin guardar" : "Salir"}
          </Button>
        </DialogActions>
      </Dialog>
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
      <GEIBreakdownModal
        open={geiModal.open}
        gasDetails={
          geiGasDetails ?? {
            CO2_FOSSIL: 0,
            CH4: 0,
            N2O: 0,
            HFC: 0,
            PFC: 0,
            SF6: 0,
            NF3: 0,
          }
        }
        declaredValue={geiDeclaredValue}
        readOnly={isViewOnly}
        onSave={handleSaveGEIBreakdown}
        onClose={() => setGeiModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
