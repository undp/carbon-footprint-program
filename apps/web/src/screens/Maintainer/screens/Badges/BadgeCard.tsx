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
  RefreshOutlined,
} from "@mui/icons-material";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";
import { formatDate } from "@/utils/formatting";
import { BadgeStateChangeDialog } from "./BadgeStateChangeDialog";
import { useActivateBadge } from "@/api/query/badges/useActivateBadge";
import { useDeactivateBadge } from "@/api/query/badges/useDeactivateBadge";
import { useBadgeUpload } from "@/api/query/badges/useBadgeUpload";
import { BADGE_TYPE_LABELS } from "./constants";

interface BadgePreviewProps {
  src: string;
  alt: string;
}

const BadgePreview: FC<BadgePreviewProps> = ({ src, alt }) => {
  const [broken, setBroken] = useState(false);
  const [key, setKey] = useState(0);

  if (broken) {
    return (
      <Box
        sx={{
          width: 120,
          height: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          bgcolor: "action.hover",
          borderRadius: 1,
          mx: "auto",
        }}
      >
        <BrokenImageOutlined color="disabled" />
        <Tooltip title="Reintentar carga">
          <IconButton
            size="small"
            onClick={() => {
              setBroken(false);
              setKey((k) => k + 1);
            }}
          >
            <RefreshOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      key={key}
      component="img"
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      sx={{
        width: 120,
        height: 120,
        objectFit: "contain",
        display: "block",
        mx: "auto",
        borderRadius: 1,
      }}
    />
  );
};

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

  const activate = useActivateBadge();
  const deactivate = useDeactivateBadge();
  const { upload, isUploading } = useBadgeUpload();

  const handleUploadClick = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

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
            "Tipo de archivo no permitido. Usa PNG, SVG, JPG o WebP."
          );
        } else if (message.includes("exceeds")) {
          setUploadError(
            "El archivo supera el tamaño máximo permitido (5 MB)."
          );
        } else {
          setUploadError("Error al subir el badge. Intenta nuevamente.");
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

  const handleDialogConfirm = useCallback(() => {
    if (!dialogState) return;
    if (dialogState.mode === "activate") {
      activate.mutate(dialogState.incoming.id, {
        onSuccess: () => setDialogState(null),
      });
    } else {
      deactivate.mutate(dialogState.outgoing.id, {
        onSuccess: () => setDialogState(null),
      });
    }
  }, [dialogState, activate, deactivate]);

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
            <Tooltip title="Subir nuevo badge">
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
            label="Badge activo"
            size="small"
            color={active ? "success" : "default"}
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
                No hay badge activo
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudUploadOutlined />}
                size="small"
                onClick={handleUploadClick}
                disabled={isMutating}
              >
                Subir badge
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
                          Recién subido · ¿Activar este badge?
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
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {dialogState && (
        <BadgeStateChangeDialog
          {...dialogState}
          open
          onClose={() => setDialogState(null)}
          onConfirm={handleDialogConfirm}
          loading={activate.isPending || deactivate.isPending}
        />
      )}
    </>
  );
};
