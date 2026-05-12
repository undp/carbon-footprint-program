import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { formatFileSize } from "@/utils/files";
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

const ZIP_MIME_TYPES = new Set<string>([
  "application/zip",
  "application/x-zip-compressed",
]);

const acceptMap: Record<string, string[]> =
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES.reduce<
    Record<string, string[]>
  >((acc, mime) => {
    acc[mime] = ZIP_MIME_TYPES.has(mime) ? [".zip"] : [];
    return acc;
  }, {});

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

  // Stored in a ref because the snapshot is read only on cancel — no
  // need to re-render the dialog when it's re-captured on open.
  const snapshotRef = useRef<{
    files: LineFileSummary[];
    removedFileIds: string[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    snapshotRef.current = {
      files: getValues(filesPath) ?? [],
      removedFileIds: getValues(removedFileIdsPath) ?? [],
    };
  }, [open, filesPath, removedFileIdsPath, getValues]);

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

  const handleCancel = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (snapshot) {
      setValue(filesPath, snapshot.files, { shouldDirty: true });
      setValue(removedFileIdsPath, snapshot.removedFileIds, {
        shouldDirty: true,
      });
    }
    onClose();
  }, [filesPath, removedFileIdsPath, setValue, onClose]);

  const handleSave = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Archivos adjuntos</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ width: "100%" }}>
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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 0,
                        }}
                      >
                        <OverflowTooltipText
                          sx={{ fontWeight: 500, flex: 1, minWidth: 0 }}
                        >
                          {file.originalName}
                        </OverflowTooltipText>
                        {file.isPending && (
                          <Chip
                            label="Pendiente de guardar"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                          />
                        )}
                        <Box sx={{ display: "flex", flexShrink: 0 }}>
                          <IconButton
                            size="small"
                            aria-label={`Previsualizar ${file.originalName}`}
                            onClick={() => handlePreview(file)}
                            disabled={disabled}
                          >
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={`Eliminar ${file.originalName}`}
                            onClick={() => handleDelete(file)}
                            disabled={disabled || isDeleting}
                          >
                            <DeleteOutlined fontSize="small" color="error" />
                          </IconButton>
                        </Box>
                      </Box>
                    }
                    secondary={formatFileSize(file.sizeBytes)}
                    slotProps={{
                      primary: { component: "div" },
                      secondary: { variant: "caption" },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <FileUpload
            value={[]}
            onChange={handleFilesPicked}
            accept={acceptMap}
            maxSizeMB={CARBON_INVENTORY_LINE_MAX_FILE_SIZE_MB}
            disabled={disabled || isUploading}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isUploading || isDeleting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isUploading || isDeleting}
        >
          Actualizar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
