import { FC, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { FileDownloadOutlined, Close } from "@mui/icons-material";
import { useSubmissionRecognitionFile } from "@/api/query";
import { BadgeType } from "@repo/types";

const DIALOG_TITLES: Record<string, string> = {
  [BadgeType.ORGANIZATION_ACCREDITATION]: "Certificado de inscripción",
  [BadgeType.CARBON_INVENTORY_CALCULATION]: "Diploma de medición",
  [BadgeType.CARBON_INVENTORY_VERIFICATION]:
    "Certificado de sello de Verificación",
  [BadgeType.REDUCTION_PLAN_VERIFICATION]: "Certificado de sello de Reducción",
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Certificado de sello de Neutralización",
};

interface RecognitionModalProps {
  submissionId: string | null;
  badgeType: string | null;
  onClose: () => void;
}

export const RecognitionModal: FC<RecognitionModalProps> = ({
  submissionId,
  badgeType,
  onClose,
}) => {
  const {
    data: recognitionFile,
    isLoading,
    error,
  } = useSubmissionRecognitionFile(submissionId ?? undefined);

  const is404 = error?.detail?.status === 404;

  // TODO: use reusable download code
  const handleDownload = useCallback(async () => {
    if (!recognitionFile) return;
    const response = await fetch(recognitionFile.previewUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = recognitionFile.originalName;
    a.click();
    URL.revokeObjectURL(url);
  }, [recognitionFile]);

  return (
    <Dialog open={!!submissionId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">
          {(badgeType && DIALOG_TITLES[badgeType]) ??
            "Diploma de reconocimiento"}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {is404 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <Typography color="text.secondary">
              No hay diploma disponible para este reconocimiento.
            </Typography>
          </Box>
        )}
        {recognitionFile && !isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            {recognitionFile.mimeType.startsWith("image/") ? (
              <img
                src={recognitionFile.previewUrl}
                alt="Diploma de reconocimiento"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <iframe
                src={recognitionFile.previewUrl}
                title="Diploma de reconocimiento"
                style={{ width: "100%", height: "70vh", border: "none" }}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {recognitionFile && (
          <Button
            startIcon={<FileDownloadOutlined />}
            onClick={handleDownload}
            variant="outlined"
          >
            Descargar
          </Button>
        )}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
