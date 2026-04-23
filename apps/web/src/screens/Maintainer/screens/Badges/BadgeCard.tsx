import { FC, useRef, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
} from "@mui/icons-material";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { useActivateBadge } from "@/api/query/badges/useActivateBadge";
import { useDeactivateBadge } from "@/api/query/badges/useDeactivateBadge";
import { useBadgeUpload } from "@/api/query/badges/useBadgeUpload";
import { ActiveBadgeCardContent } from "./ActiveBadgeCardContent";
import { BadgeHistoryDialog } from "./BadgeHistoryDialog";
import { BadgeStateChangeDialog } from "./BadgeStateChangeDialog";
import { InactiveBadgeCardContent } from "./InactiveBadgeCardContent";
import {
  BADGE_TYPE_LABELS,
  BADGE_UPLOAD_ACCEPTED_EXTENSIONS_LABEL,
  BADGE_UPLOAD_ACCEPT_ATTRIBUTE,
} from "./constants";

type BadgeDialogState =
  | { mode: "activate"; incoming: BadgeDTO; outgoing: BadgeDTO }
  | { mode: "deactivate"; outgoing: BadgeDTO }
  | null;

interface BadgeCardProps {
  entry: BadgeCatalogEntry;
}

export const BadgeCard: FC<BadgeCardProps> = ({ entry }) => {
  const { type, active, history } = entry;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newlyUploadedId, setNewlyUploadedId] = useState<string | undefined>();

  const [dialogState, setDialogState] = useState<BadgeDialogState>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
        setHistoryOpen(true);
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
        activate.mutate(badge.id, { onSuccess: () => setHistoryOpen(false) });
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
        onSuccess: () => {
          handleDialogClose();
          setHistoryOpen(false);
        },
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
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 360,
        }}
      >
        <CardContent
          sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1 }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                alignItems: "center",
              }}
              variant="subtitle1"
              fontWeight={600}
            >
              {BADGE_TYPE_LABELS[type]}
              <Chip
                icon={<CheckCircleOutlined />}
                label={active ? "Activo" : "Inactivo"}
                size="small"
                color={active ? "success" : "warning"}
                variant="outlined"
              />
            </Typography>
          </Stack>

          {active ? (
            <ActiveBadgeCardContent active={active} />
          ) : (
            <InactiveBadgeCardContent />
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

          <Box
            sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            <Button
              sx={{ mr: "auto" }}
              size="small"
              startIcon={<HistoryOutlined />}
              onClick={() => setHistoryOpen(true)}
              disabled={history.length === 0}
            >
              Ver historial ({history.length})
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadOutlined />}
              size="small"
              onClick={handleUploadClick}
            >
              Subir sello
            </Button>
            {active && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={handleDeactivateClick}
                disabled={isMutating}
              >
                Desactivar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={BADGE_UPLOAD_ACCEPT_ATTRIBUTE}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <BadgeHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        newlyUploadedId={newlyUploadedId}
        disabled={isMutating}
        onActivate={handleActivateClick}
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
