import { FC, useCallback, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Routes } from "@/interfaces";

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
}

export const SaveDraftAuthModal: FC<Props> = ({
  open,
  onClose,
  inventoryId,
}) => {
  const { signInRedirect } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Full-page redirect to the IdP, returning to the claim route once
  // authenticated — that route (domain-owned) reclaims this draft and lands on
  // the list. The claim does NOT live here or in auth, so closing/cancelling
  // the IdP page can never strand this modal (the page is unloaded; there is no
  // pending promise to hang on).
  const handleSignIn = useCallback(async () => {
    setIsRedirecting(true);
    try {
      const returnTo = router.buildLocation({
        to: Routes.CARBON_INVENTORY_CLAIM,
        params: { inventoryId },
      }).href;
      await signInRedirect(returnTo);
    } finally {
      // Only reached if the redirect didn't start (e.g. OIDC not configured);
      // on success the page is already navigating away.
      setIsRedirecting(false);
    }
  }, [signInRedirect, router, inventoryId]);

  return (
    <Dialog open={open} onClose={isRedirecting ? undefined : onClose}>
      <DialogTitle>Guarda tu inventario</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Para guardar tu borrador necesitas iniciar sesión o crear una cuenta.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isRedirecting}>
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSignIn()}
          color="primary"
          variant="contained"
          disabled={isRedirecting}
          startIcon={isRedirecting ? <CircularProgress size={16} /> : undefined}
        >
          Iniciar Sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
};
