import { FC, useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import {
  DeleteOutlined,
  InsertDriveFileOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES,
  CARBON_INVENTORY_LINE_MAX_FILE_SIZE_MB,
} from "@repo/constants";
import { FileUpload } from "@/components/FileUpload";
import { OverflowTooltipText } from "@/components/OverflowTooltipText";
import { buildDropzoneAcceptMap, formatFileSize } from "@/utils/files";
import { validateLineFileOriginalName } from "@/utils/validateLineFileOriginalName";
import { useUploadCarbonInventoryLineFiles } from "@/api/query/carbonInventories/useUploadCarbonInventoryLineFiles";
import { useDeleteCarbonInventoryLineFile } from "@/api/query/carbonInventories/useDeleteCarbonInventoryLineFile";
import { usePreviewCarbonInventoryLineFile } from "@/api/query/carbonInventories/usePreviewCarbonInventoryLineFile";
import {
  EmissionCaptureFormValues,
  LineFileSummary,
} from "../../types/EmissionCaptureTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  lineId: string;
  subcategoryId: string;
  inventoryId: string;
  disabled?: boolean;
}

const acceptMap = buildDropzoneAcceptMap(
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES
);

export const EmissionEditorFilesDialog: FC<Props> = ({
  open,
  onClose,
  lineId,
  subcategoryId,
  inventoryId,
  disabled = false,
}) => {
  const { control, getValues, setValue } =
    useFormContext<EmissionCaptureFormValues>();
  const { enqueueSnackbar } = useSnackbar();

  const filesPath =
    `subcategories.${subcategoryId}.lines.${lineId}.files` as const;
  const removedFileIdsPath =
    `subcategories.${subcategoryId}.lines.${lineId}.removedFileIds` as const;

  const watchedFiles = useWatch({ control, name: filesPath });
  const watchedRemoved = useWatch({ control, name: removedFileIdsPath });

  const files = useMemo(() => watchedFiles ?? [], [watchedFiles]);
  const removedFileIds = useMemo(() => watchedRemoved ?? [], [watchedRemoved]);

  const visibleFiles = useMemo(
    () => files.filter((file) => !removedFileIds.includes(file.id)),
    [files, removedFileIds]
  );

  const { preUploadFiles, isUploading } =
    useUploadCarbonInventoryLineFiles(inventoryId);
  const { mutateAsync: deleteFile, isPending: isDeleting } =
    useDeleteCarbonInventoryLineFile(inventoryId);
  const { getPreviewUrl } = usePreviewCarbonInventoryLineFile(inventoryId);

  const handleFilesPicked = useCallback(
    async (picked: File[]) => {
      if (picked.length === 0) return;

      const valid: File[] = [];
      for (const file of picked) {
        const result = validateLineFileOriginalName(file.name);
        if (result.ok) {
          valid.push(file);
        } else {
          enqueueSnackbar(`"${file.name}": ${result.reason}`, {
            variant: "error",
          });
        }
      }

      if (valid.length === 0) return;

      try {
        const uploaded = await preUploadFiles(valid);
        const next = [
          ...(getValues(filesPath) ?? []),
          ...uploaded.map<LineFileSummary>((file) => ({
            id: file.id,
            uuid: file.uuid,
            originalName: file.originalName,
            sizeBytes: file.sizeBytes,
            isPending: true,
          })),
        ];
        setValue(filesPath, next, { shouldDirty: true });
        enqueueSnackbar(
          uploaded.length === 1
            ? "Archivo subido correctamente"
            : `${uploaded.length} archivos subidos correctamente`,
          { variant: "success" }
        );
      } catch {
        enqueueSnackbar("Error al subir los archivos", { variant: "error" });
      }
    },
    [preUploadFiles, getValues, filesPath, setValue, enqueueSnackbar]
  );

  const handlePreview = useCallback(
    async (file: LineFileSummary) => {
      try {
        const url = await getPreviewUrl(file.uuid);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        enqueueSnackbar("Error al previsualizar el archivo", {
          variant: "error",
        });
      }
    },
    [getPreviewUrl, enqueueSnackbar]
  );

  const handleDelete = useCallback(
    async (file: LineFileSummary) => {
      if (file.isPending) {
        try {
          await deleteFile({ uuid: file.uuid });
          const next = (getValues(filesPath) ?? []).filter(
            (entry) => entry.uuid !== file.uuid
          );
          setValue(filesPath, next, { shouldDirty: true });
          enqueueSnackbar("Archivo eliminado correctamente", {
            variant: "success",
          });
        } catch {
          enqueueSnackbar("Error al eliminar el archivo", {
            variant: "error",
          });
        }
        return;
      }

      const currentRemoved = getValues(removedFileIdsPath) ?? [];
      if (currentRemoved.includes(file.id)) return;
      setValue(removedFileIdsPath, [...currentRemoved, file.id], {
        shouldDirty: true,
      });
      enqueueSnackbar("Archivo eliminado correctamente", {
        variant: "success",
      });
    },
    [
      deleteFile,
      getValues,
      filesPath,
      removedFileIdsPath,
      setValue,
      enqueueSnackbar,
    ]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { maxHeight: "80vh" } } }}
    >
      <DialogTitle>Archivos adjuntos ({visibleFiles.length})</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack
          spacing={2}
          sx={{ width: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <Box
            sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", pr: 0.5 }}
          >
            {visibleFiles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay archivos adjuntos a esta línea.
              </Typography>
            ) : (
              <List dense disablePadding>
                {visibleFiles.map((file) => (
                  <ListItem
                    key={file.uuid}
                    disableGutters
                    sx={{
                      backgroundColor: "action.hover",
                      borderRadius: 1,
                      px: 1,
                      py: 0.25,
                      mb: 0.5,
                      gap: 1,
                    }}
                  >
                    <InsertDriveFileOutlined
                      fontSize="small"
                      sx={{ color: "text.secondary", flexShrink: 0 }}
                    />
                    <ListItemText
                      sx={{ minWidth: 0, my: 0, flex: 1 }}
                      primary={
                        <OverflowTooltipText
                          sx={{ fontWeight: 500, minWidth: 0 }}
                        >
                          {file.originalName}
                        </OverflowTooltipText>
                      }
                      secondary={formatFileSize(file.sizeBytes)}
                      slotProps={{
                        primary: { component: "div" },
                        secondary: { variant: "caption" },
                      }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconButton
                        size="small"
                        sx={{ p: 0.5 }}
                        aria-label={`Previsualizar ${file.originalName}`}
                        onClick={() => handlePreview(file)}
                        disabled={disabled}
                      >
                        <VisibilityOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ p: 0.5 }}
                        aria-label={`Eliminar ${file.originalName}`}
                        onClick={() => handleDelete(file)}
                        disabled={disabled || isDeleting}
                      >
                        <DeleteOutlined
                          fontSize="small"
                          sx={{ color: "text.secondary" }}
                        />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <FileUpload
            value={[]}
            onChange={handleFilesPicked}
            accept={acceptMap}
            maxSizeMB={CARBON_INVENTORY_LINE_MAX_FILE_SIZE_MB}
            disabled={disabled || isUploading}
          />

          {isUploading && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Subiendo archivos...
              </Typography>
              <LinearProgress />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={onClose}
          disabled={isUploading || isDeleting}
        >
          Actualizar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
