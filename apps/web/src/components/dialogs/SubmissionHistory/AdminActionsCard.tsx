import { FC, useCallback, useState } from "react";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Theme,
  Typography,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import {
  AdminPanelSettingsOutlined,
  CheckCircleOutlined,
  WarningAmberOutlined,
  SendOutlined,
  UploadFileOutlined,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import {
  ApproveRequestBody,
  ReviewSubmissionBody,
  SubmissionType,
} from "@repo/types";
import { FileUpload } from "@/components/FileUpload";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";

type Action = "approve" | "review";

type Props = {
  onApprove: (body: ApproveRequestBody) => Promise<void>;
  onReview: (body: ReviewSubmissionBody) => Promise<void>;
  isBusy: boolean;
  type: SubmissionType;
};

const RADIO_OPTIONS: { value: Action; label: string; icon: React.ReactNode }[] =
  [
    {
      value: "approve",
      label: "Aprobar solicitud",
      icon: <CheckCircleOutlined sx={{ fontSize: 18 }} />,
    },
    {
      value: "review",
      label: "Solicitar cambios",
      icon: <WarningAmberOutlined sx={{ fontSize: 18 }} />,
    },
  ];

export const AdminActionsCard: FC<Props> = ({
  onApprove,
  onReview,
  isBusy,
  type,
}) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [comment, setComment] = useState("");
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [recognitionFiles, setRecognitionFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { preUploadFiles } = usePreUploadSubmissionFiles();

  const isCommentRequired = selectedAction === "review";
  const isOrganizationInscription =
    type === SubmissionType.ORGANIZATION_ACCREDITATION;
  const busy = isBusy || isUploading;
  const isSubmitDisabled =
    busy || !selectedAction || (isCommentRequired && !comment.trim());

  const showDocumentUploadSection =
    !isOrganizationInscription || selectedAction === "review";

  const showRecognitionUploadSection =
    selectedAction === "approve" && !isOrganizationInscription;

  const resetState = useCallback(
    (action: Action) => {
      if (action === selectedAction) return;
      setSelectedAction(action);
      setComment("");
      setDocFiles([]);
      setRecognitionFiles([]);
    },
    [selectedAction]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedAction) return;
    setIsUploading(true);
    try {
      const reviewFileUuids = docFiles.length
        ? await preUploadFiles(docFiles)
        : undefined;

      if (selectedAction === "approve") {
        const recognitionFileUuids = recognitionFiles.length
          ? await preUploadFiles(recognitionFiles)
          : undefined;
        await onApprove({
          reviewComments: comment || undefined,
          reviewFileUuids,
          recognitionFileUuids,
        });
      } else {
        await onReview({
          reviewComments: comment,
          reviewFileUuids,
        });
      }
    } catch {
      enqueueSnackbar("Error al cargar los archivos adjuntos", {
        variant: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedAction,
    comment,
    docFiles,
    recognitionFiles,
    onApprove,
    onReview,
    preUploadFiles,
    enqueueSnackbar,
  ]);

  return (
    <Stack spacing={0} sx={{ mt: 2 }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: theme.palette.common.glossyTeal,
          borderRadius: "10px 10px 0 0",
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AdminPanelSettingsOutlined
          sx={{ fontSize: 16, color: theme.palette.common.white }}
        />
        <Typography
          variant="body2"
          fontWeight={700}
          color={theme.palette.common.white}
          letterSpacing={0.5}
          sx={{ textTransform: "uppercase", fontSize: 13 }}
        >
          Acciones de Administrador
        </Typography>
      </Box>

      {/* Body */}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          p: 2,
        }}
      >
        {/* Radio group */}
        <RadioGroup
          value={selectedAction ?? ""}
          onChange={(e) => resetState(e.target.value as Action)}
        >
          <Stack spacing={1}>
            {RADIO_OPTIONS.map(({ value, label, icon }) => {
              const isSelected = selectedAction === value;

              return (
                <Box
                  key={value}
                  sx={(theme) => {
                    const { bg, border } = getRadioStyles(theme, value);
                    return {
                      border: `1px solid ${isSelected ? border : theme.palette.divider}`,
                      borderRadius: "8px",
                      bgcolor: isSelected ? bg : theme.palette.common.white,
                      px: 1.5,
                      py: 1,
                      cursor: busy ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    };
                  }}
                  onClick={() => !busy && resetState(value)}
                >
                  <FormControlLabel
                    value={value}
                    disabled={busy}
                    control={
                      <Radio
                        size="small"
                        sx={(theme) => {
                          const { radioColor } = getRadioStyles(theme, value);
                          return {
                            color: isSelected ? radioColor : "#9ca3af",
                            "&.Mui-checked": { color: radioColor },
                            p: 0.5,
                          };
                        }}
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box
                          sx={(theme) => {
                            const { border } = getRadioStyles(theme, value);
                            return {
                              color: isSelected
                                ? border
                                : theme.palette.text.secondary,
                              display: "flex",
                            };
                          }}
                        >
                          {icon}
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={isSelected ? 600 : 400}
                          sx={(theme) => {
                            const { border } = getRadioStyles(theme, value);
                            return {
                              color: isSelected
                                ? border
                                : theme.palette.text.primary,
                            };
                          }}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    }
                    sx={{ m: 0, width: "100%" }}
                  />
                </Box>
              );
            })}
          </Stack>
        </RadioGroup>

        {/* Contextual inputs */}
        {selectedAction && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {isCommentRequired && (
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={theme.palette.text.primary}
                >
                  Comentario{" "}
                  <Box component="span" color={theme.palette.error.main}>
                    *
                  </Box>
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  placeholder="Escriba sus observaciones o comentarios sobre la postulación..."
                  disabled={busy}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      "& fieldset": { borderColor: theme.palette.divider },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color={theme.palette.text.secondary}
                  textAlign="right"
                >
                  {comment.length} / 2000
                </Typography>
              </Stack>
            )}

            {showDocumentUploadSection && (
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={theme.palette.text.primary}
                >
                  Adjuntar documentos
                </Typography>
                <FileUpload
                  value={docFiles}
                  onChange={setDocFiles}
                  disabled={busy}
                >
                  <Box className="flex w-full items-center justify-center gap-1 rounded p-3">
                    <UploadFileOutlined />
                    <Typography variant="subtitle2">
                      Adjuntar archivo
                    </Typography>
                  </Box>
                </FileUpload>
              </Stack>
            )}

            {showRecognitionUploadSection && (
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={theme.palette.text.primary}
                >
                  Adjuntar reconocimiento
                </Typography>
                <FileUpload
                  value={recognitionFiles}
                  onChange={setRecognitionFiles}
                  disabled={busy}
                >
                  <Box className="flex w-full items-center justify-center gap-1 rounded p-3">
                    <WorkspacePremiumRounded className="fill-primary!" />
                    <Typography variant="subtitle2" color="primary">
                      Adjuntar reconocimiento
                    </Typography>
                  </Box>
                </FileUpload>
              </Stack>
            )}
          </Stack>
        )}

        {/* Submit */}
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            disabled={isSubmitDisabled}
            startIcon={
              busy ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <SendOutlined />
              )
            }
            onClick={handleSubmit}
            sx={{
              bgcolor: theme.palette.common.glossyTeal,
              "&:hover": {
                bgcolor: alpha(theme.palette.common.glossyTeal, 0.8),
              },
              borderRadius: "8px",
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: 0.5,
              px: 3,
            }}
          >
            Enviar
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

const getRadioStyles = (
  theme: Theme,
  action: Action
): { border: string; bg: string; radioColor: string } => {
  if (action === "approve") {
    return {
      border: theme.palette.success.light,
      bg: alpha(theme.palette.success.light, 0.1),
      radioColor: theme.palette.success.light,
    };
  }
  return {
    border: theme.palette.warning.main,
    bg: alpha(theme.palette.warning.light, 0.1),
    radioColor: theme.palette.warning.main,
  };
};
