import { FC, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  ImageNotSupportedOutlined,
} from "@mui/icons-material";
import { BadgeType } from "@repo/types";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";
import {
  useBadgeCatalog,
  useActivateBadge,
  useDeactivateBadge,
  useRequestBadgeUpload,
  useConfirmBadgeUpload,
} from "@/api/query/badges/useBadgeCatalog";
import {
  ActivateBadgeDialog,
  DeactivateBadgeDialog,
} from "./BadgeStateChangeDialog";
import { AppHttpError } from "@/api/http/errors";

const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  ORGANIZATION_ACCREDITATION: "Acreditación de organización",
  CARBON_INVENTORY_CALCULATION: "Cálculo de inventario de carbono",
  CARBON_INVENTORY_VERIFICATION: "Verificación de inventario de carbono",
  REDUCTION_PROJECT_VERIFICATION: "Verificación de proyecto de reducción",
  NEUTRALIZATION_PLAN_VERIFICATION: "Verificación de plan de neutralización",
};

const ACCEPT_MIME_TYPES = "image/png,image/svg+xml,image/jpeg,image/webp";

interface BadgeImageProps {
  src: string;
  alt: string;
}

const BadgeImage: FC<BadgeImageProps> = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);
  const [key, setKey] = useState(0);

  if (errored) {
    return (
      <Stack alignItems="center" spacing={0.5}>
        <ImageNotSupportedOutlined color="disabled" sx={{ fontSize: 48 }} />
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setErrored(false);
            setKey((k) => k + 1);
          }}
        >
          Reintentar
        </Button>
      </Stack>
    );
  }

  return (
    <Box
      key={key}
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: "100%",
        maxHeight: 120,
        objectFit: "contain",
        display: "block",
      }}
      onError={() => setErrored(true)}
    />
  );
};

interface BadgeCardProps {
  entry: BadgeCatalogEntry;
  onUpload: (file: File, badgeType: string) => Promise<void>;
  uploadingType: string | null;
  uploadError: string | null;
  justUploadedId: string | null;
  onActivate: (badge: BadgeDTO, entry: BadgeCatalogEntry) => void;
  onDeactivate: (badge: BadgeDTO) => void;
}

const BadgeCard: FC<BadgeCardProps> = ({
  entry,
  onUpload,
  uploadingType,
  uploadError,
  justUploadedId,
  onActivate,
  onDeactivate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingType === entry.type;

  return (
    <Card
      sx={{
        borderRadius: "16px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              {BADGE_TYPE_LABELS[entry.type]}
            </Typography>
            <Tooltip title="Subir nuevo badge">
              <span>
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <CircularProgress size={18} />
                  ) : (
                    <CloudUploadOutlined />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_MIME_TYPES}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file, entry.type);
                e.target.value = "";
              }}
            />
          </Stack>

          {isUploading && uploadError && (
            <Alert severity="error" sx={{ py: 0 }}>
              {uploadError}
            </Alert>
          )}

          {/* Active badge */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <CheckCircleOutlined fontSize="inherit" color="success" />
              Badge activo
            </Typography>

            {entry.active ? (
              <Stack spacing={1}>
                <BadgeImage
                  src={entry.active.previewUrl}
                  alt={entry.active.fileName}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" display="block">
                      {entry.active.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(entry.active.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="warning"
                    variant="outlined"
                    onClick={() => onDeactivate(entry.active!)}
                  >
                    Desactivar
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack
                alignItems="center"
                spacing={1}
                sx={{
                  py: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <ImageNotSupportedOutlined color="disabled" sx={{ fontSize: 40 }} />
                <Typography variant="caption" color="text.secondary">
                  No hay badge activo
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Subir badge
                </Button>
              </Stack>
            )}
          </Box>

          {/* History */}
          {entry.history.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  <HistoryOutlined fontSize="inherit" />
                  Historial
                </Typography>
                <Stack spacing={1}>
                  {entry.history.map((badge) => (
                    <Stack
                      key={badge.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        p: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor:
                          badge.id === justUploadedId
                            ? "action.selected"
                            : undefined,
                      }}
                    >
                      <Box
                        component="img"
                        src={badge.previewUrl}
                        alt={badge.fileName}
                        sx={{ width: 40, height: 40, objectFit: "contain" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="caption" display="block" noWrap>
                          {badge.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(badge.createdAt).toLocaleDateString()}
                        </Typography>
                        {badge.id === justUploadedId && (
                          <Chip
                            label="Recién subido. ¿Activar?"
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={() => onActivate(badge, entry)}
                            sx={{ mt: 0.5, cursor: "pointer" }}
                          />
                        )}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onActivate(badge, entry)}
                      >
                        Activar
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          {isUploading && !uploadError && (
            <Alert severity="info" sx={{ py: 0 }}>
              Subiendo badge...
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

interface ActivateDialogState {
  badge: BadgeDTO;
  entry: BadgeCatalogEntry;
}

interface DeactivateDialogState {
  badge: BadgeDTO;
}

export const BadgesScreen: FC = () => {
  const { data: catalog, isLoading, error } = useBadgeCatalog();
  const activate = useActivateBadge();
  const deactivate = useDeactivateBadge();
  const requestUpload = useRequestBadgeUpload();
  const confirmUpload = useConfirmBadgeUpload();

  const [activateDialog, setActivateDialog] =
    useState<ActivateDialogState | null>(null);
  const [deactivateDialog, setDeactivateDialog] =
    useState<DeactivateDialogState | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [justUploadedId, setJustUploadedId] = useState<string | null>(null);

  const handleUpload = async (file: File, badgeType: string) => {
    setUploadingType(badgeType);
    setUploadError(null);
    setJustUploadedId(null);

    try {
      const { uuid, uploadUrl } = await requestUpload.mutateAsync({
        badgeType,
        originalName: file.name,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error al subir el archivo (${uploadResponse.status})`);
      }

      const result = await confirmUpload.mutateAsync({
        badgeType,
        uuid,
        originalName: file.name,
      });

      setJustUploadedId(result.badge.id);
    } catch (err) {
      let message = "Error al subir el badge";
      if (err instanceof AppHttpError) {
        if (err.errorCode === "BADGE_FILE_MIME_TYPE_ERROR") {
          message = "Tipo de archivo no permitido. Use PNG, SVG, JPEG o WebP.";
        } else if (err.errorCode === "BADGE_FILE_SIZE_ERROR") {
          message = "El archivo supera el tamaño máximo permitido (5 MB).";
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setUploadError(message);
    } finally {
      setUploadingType(null);
    }
  };

  const handleActivateClick = (badge: BadgeDTO, entry: BadgeCatalogEntry) => {
    if (entry.active && entry.active.id !== badge.id) {
      setActivateDialog({ badge, entry });
    } else {
      void activate.mutateAsync(badge.id);
    }
  };

  const handleDeactivateClick = (badge: BadgeDTO) => {
    setDeactivateDialog({ badge });
  };

  const handleConfirmActivate = async () => {
    if (!activateDialog) return;
    await activate.mutateAsync(activateDialog.badge.id);
    setActivateDialog(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateDialog) return;
    await deactivate.mutateAsync(deactivateDialog.badge.id);
    setDeactivateDialog(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar el catálogo de badges. Intenta recargar la página.
      </Alert>
    );
  }

  return (
    <Box className="flex flex-col gap-6">
      {/* Header */}
      <Card
        sx={{
          p: 2,
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Gestión de Badges
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los badges de reconocimiento por tipo. Sube nuevos badges,
            activa o desactiva los existentes.
          </Typography>
        </Box>
      </Card>

      {/* Badge cards grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        {catalog?.map((entry) => (
          <BadgeCard
            key={entry.type}
            entry={entry}
            onUpload={handleUpload}
            uploadingType={uploadingType}
            uploadError={uploadingType === entry.type ? uploadError : null}
            justUploadedId={justUploadedId}
            onActivate={handleActivateClick}
            onDeactivate={handleDeactivateClick}
          />
        ))}
      </Box>

      {/* Activate dialog */}
      {activateDialog && activateDialog.entry.active && (
        <ActivateBadgeDialog
          open
          onClose={() => setActivateDialog(null)}
          onConfirm={() => void handleConfirmActivate()}
          loading={activate.isPending}
          incoming={activateDialog.badge}
          outgoing={activateDialog.entry.active}
        />
      )}

      {/* Deactivate dialog */}
      {deactivateDialog && (
        <DeactivateBadgeDialog
          open
          onClose={() => setDeactivateDialog(null)}
          onConfirm={() => void handleConfirmDeactivate()}
          loading={deactivate.isPending}
          badge={deactivateDialog.badge}
        />
      )}
    </Box>
  );
};
