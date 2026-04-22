import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Alert,
} from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import type { BadgeDTO } from "@repo/types";
import { BadgePreviewMini } from "./BadgePreviewMini";

interface ActivateDialogProps {
  mode: "activate";
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  incoming: BadgeDTO;
  outgoing: BadgeDTO;
  loading?: boolean;
}

interface DeactivateDialogProps {
  mode: "deactivate";
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  outgoing: BadgeDTO;
  loading?: boolean;
}

type BadgeStateChangeDialogProps = ActivateDialogProps | DeactivateDialogProps;

export const BadgeStateChangeDialog: FC<BadgeStateChangeDialogProps> = (
  props
) => {
  const { mode, open, onClose, onConfirm, outgoing, loading } = props;
  const incoming = mode === "activate" ? props.incoming : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WarningAmberOutlined color="warning" />
        {mode === "activate" ? "Reemplazar sello activo" : "Desactivar sello"}
      </DialogTitle>
      <DialogContent>
        {mode === "activate" && incoming ? (
          <Box>
            <Typography variant="body2" mb={2}>
              Esta acción reemplazará el sello activo actual.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
              <BadgePreviewMini
                badge={outgoing}
                label="Actual (quedará inactivo)"
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: "text.secondary",
                  fontSize: 24,
                }}
              >
                →
              </Box>
              <BadgePreviewMini
                badge={incoming}
                label="Nuevo (pasará a activo)"
              />
            </Stack>
          </Box>
        ) : (
          <Box>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <BadgePreviewMini
                badge={outgoing}
                label="Sello que se desactivará"
              />
            </Box>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Este tipo no tendrá sello activo hasta que actives otro. Las
              aprobaciones durante ese periodo se registrarán sin sello.
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={mode === "deactivate" ? "warning" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {mode === "activate" ? "Activar" : "Desactivar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
