import { FC, useRef, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  BrokenImageOutlined,
} from "@mui/icons-material";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";
import { formatDate } from "@/utils/formatting";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { BadgePreview } from "./BadgePreview";
import { BadgeStateChangeDialog } from "./BadgeStateChangeDialog";
import { useActivateBadge } from "@/api/query/badges/useActivateBadge";
import { useDeactivateBadge } from "@/api/query/badges/useDeactivateBadge";
import { useBadgeUpload } from "@/api/query/badges/useBadgeUpload";
import {
  BADGE_TYPE_LABELS,
  BADGE_UPLOAD_ACCEPTED_EXTENSIONS_LABEL,
  BADGE_UPLOAD_ACCEPT_ATTRIBUTE,
} from "./constants";

interface BadgeCardProps {
  entry: BadgeCatalogEntry;
}

export const BadgeCard: FC<BadgeCardProps> = ({ entry }) => {
  const { type, active, history } = entry;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newlyUploadedId, setNewlyUploadedId] = useState<string | undefined>();

  const [dialogState, setDialogState] = useState<
    | { mode: "activate"; incoming: BadgeDTO; outgoing: BadgeDTO }
    | { mode: "deactivate"; outgoing: BadgeDTO }
    | null
  >(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const activate = useActivateBadge();
  const deactivate = useDeactivateBadge();
  const { upload, isUploading, reset: resetUpload } = useBadgeUpload();

  const handleUploadClick = useCallback(() => {
    setUploadError(null);
    resetUpload();
    fileInputRef.current?.click();
  }, [resetUpload]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      try {
        const result = await upload(file, type);
        setNewlyUploadedId(result.badge.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al subir el archivo";
        if (message.includes("Unsupported file type")) {
          setUploadError(
            `Tipo de archivo no permitido. Usa ${BADGE_UPLOAD_ACCEPTED_EXTENSIONS_LABEL}.`
          );
        } else if (message.includes("exceeds")) {
          setUploadError("El archivo supera el tamaño máximo permitido.");
        } else {
          setUploadError("Error al subir el sello. Intenta nuevamente.");
        }
      }
    },
    [upload, type]
  );

  const handleActivateClick = useCallback(
    (badge: BadgeDTO) => {
      if (active) {
        setDialogState({ mode: "activate", incoming: badge, outgoing: active });
      } else {
        activate.mutate(badge.id);
      }
    },
    [active, activate]
  );

  const handleDeactivateClick = useCallback(() => {
    if (active) {
      setDialogState({ mode: "deactivate", outgoing: active });
    }
  }, [active]);

  const handleDialogClose = useCallback(() => {
    setDialogState(null);
    setDialogError(null);
  }, []);

  const handleDialogConfirm = useCallback(() => {
    if (!dialogState) return;
    setDialogError(null);
    if (dialogState.mode === "activate") {
      activate.mutate(dialogState.incoming.id, {
        onSuccess: () => handleDialogClose(),
        onError: (err) =>
          setDialogError(
            getApiErrorMessage(err, "No se pudo activar el sello.")
          ),
      });
    } else {
      deactivate.mutate(dialogState.outgoing.id, {
        onSuccess: () => handleDialogClose(),
        onError: (err) =>
          setDialogError(
            getApiErrorMessage(err, "No se pudo desactivar el sello.")
          ),
      });
    }
  }, [dialogState, activate, deactivate, handleDialogClose]);

  const isMutating = activate.isPending || deactivate.isPending || isUploading;

  return (
    <>
      <Card sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0,0,0,0.08)" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={1.5}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {BADGE_TYPE_LABELS[type]}
            </Typography>
            <Tooltip title="Subir nuevo sello">
              <IconButton
                size="small"
                onClick={handleUploadClick}
                disabled={isMutating}
              >
                <CloudUploadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Chip
            icon={<CheckCircleOutlined />}
            label={active ? "Sello activo" : "Sello inactivo"}
            size="small"
            color={active ? "success" : "warning"}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          {active ? (
            <Box>
              <BadgePreview src={active.previewUrl} alt={active.fileName} />
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                mt={1}
                noWrap
              >
                {active.fileName}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                align="center"
                display="block"
              >
                {formatDate(active.createdAt)}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={handleDeactivateClick}
                  disabled={isMutating}
                >
                  Desactivar
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 2,
                py: 3,
                textAlign: "center",
              }}
            >
              <BrokenImageOutlined
                sx={{ fontSize: 36, color: "text.disabled", mb: 1 }}
              />
              <Typography
                variant="body2"
                color="text.disabled"
                display="block"
                mb={1.5}
              >
                No hay sello activo
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudUploadOutlined />}
                size="small"
                onClick={handleUploadClick}
                disabled={isMutating}
              >
                Subir sello
              </Button>
            </Box>
          )}

          {uploadError && (
            <Alert
              severity="error"
              sx={{ mt: 1.5 }}
              onClose={() => setUploadError(null)}
            >
              {uploadError}
            </Alert>
          )}

          {history.length > 0 && (
            <Box mt={2}>
              <Divider sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Historial
                </Typography>
              </Divider>
              <Stack spacing={1}>
                {history.map((badge) => (
                  <Stack
                    key={badge.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Box
                      component="img"
                      src={badge.previewUrl}
                      alt={badge.fileName}
                      sx={{
                        width: 40,
                        height: 40,
                        objectFit: "contain",
                        borderRadius: 0.5,
                        border: "1px solid",
                        borderColor: "divider",
                        flexShrink: 0,
                        opacity: badge.id === newlyUploadedId ? 1 : 0.85,
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.3";
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {badge.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(badge.createdAt)}
                      </Typography>
                      {badge.id === newlyUploadedId && (
                        <Typography
                          variant="caption"
                          color="primary"
                          display="block"
                        >
                          Recién subido · ¿Activar este sello?
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleActivateClick(badge)}
                      disabled={isMutating}
                      sx={{ flexShrink: 0 }}
                    >
                      Activar
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={BADGE_UPLOAD_ACCEPT_ATTRIBUTE}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {dialogState && (
        <BadgeStateChangeDialog
          {...dialogState}
          open
          onClose={handleDialogClose}
          onConfirm={handleDialogConfirm}
          loading={activate.isPending || deactivate.isPending}
          errorMessage={dialogError}
        />
      )}
    </>
  );
};
