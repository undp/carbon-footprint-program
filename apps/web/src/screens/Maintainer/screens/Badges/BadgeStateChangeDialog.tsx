import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { FC } from "react";
import type { BadgeDTO } from "@repo/types";

interface ActivateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  incoming: BadgeDTO;
  outgoing: BadgeDTO;
}

export const ActivateBadgeDialog: FC<ActivateDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
  incoming,
  outgoing,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Reemplazar badge activo</DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Al activar este badge, el badge activo actual será desactivado.
        </Typography>
        <Box
          sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}
        >
          <Box flex={1} sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Badge saliente
            </Typography>
            <Box
              component="img"
              src={outgoing.previewUrl}
              alt={outgoing.fileName}
              sx={{
                width: "100%",
                maxHeight: 120,
                objectFit: "contain",
                display: "block",
                mb: 0.5,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Typography variant="caption">{outgoing.fileName}</Typography>
          </Box>
          <Box flex={1} sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Badge entrante
            </Typography>
            <Box
              component="img"
              src={incoming.previewUrl}
              alt={incoming.fileName}
              sx={{
                width: "100%",
                maxHeight: 120,
                objectFit: "contain",
                display: "block",
                mb: 0.5,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Typography variant="caption">{incoming.fileName}</Typography>
          </Box>
        </Box>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={onConfirm}
        disabled={loading}
      >
        Activar
      </Button>
    </DialogActions>
  </Dialog>
);

interface DeactivateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  badge: BadgeDTO;
}

export const DeactivateBadgeDialog: FC<DeactivateDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
  badge,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <WarningAmberOutlined color="warning" />
      Desactivar badge
    </DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        <Box sx={{ textAlign: "center" }}>
          <Box
            component="img"
            src={badge.previewUrl}
            alt={badge.fileName}
            sx={{
              width: "100%",
              maxHeight: 120,
              objectFit: "contain",
              display: "block",
              mb: 0.5,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Typography variant="caption">{badge.fileName}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Este tipo de badge no tendrá ningún badge activo hasta que actives
          otro.
        </Typography>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button
        variant="contained"
        color="warning"
        onClick={onConfirm}
        disabled={loading}
      >
        Desactivar
      </Button>
    </DialogActions>
  </Dialog>
);
