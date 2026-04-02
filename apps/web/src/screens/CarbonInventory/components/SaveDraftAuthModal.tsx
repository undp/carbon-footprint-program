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
import { useSnackbar } from "notistack";
import { useAuth } from "@/contexts/AuthContext";
import { useClaimCarbonInventory } from "@/api/query";
import { getInventoryUuidFromLocalStorage } from "@/api/query/carbonInventories/authHeaders";
import { useCommonNavigation } from "../hooks/useCommonNavigation";

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
  const { signInPopup } = useAuth();
  const { goToList } = useCommonNavigation();
  const { enqueueSnackbar } = useSnackbar();
  const claimMutation = useClaimCarbonInventory();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isLoading = isSigningIn || claimMutation.isPending;

  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    try {
      await signInPopup();
    } catch {
      setIsSigningIn(false);
      return;
    }
    setIsSigningIn(false);

    const uuid = getInventoryUuidFromLocalStorage(inventoryId);
    if (!uuid) {
      enqueueSnackbar("No se pudo recuperar el inventario.", {
        variant: "error",
      });
      return;
    }

    try {
      await claimMutation.mutateAsync({ inventoryId, uuid });
      onClose();
      goToList();
    } catch {
      enqueueSnackbar(
        "No se pudo guardar el inventario. Es posible que ya esté asociado a otro usuario.",
        { variant: "error" }
      );
    }
  }, [
    signInPopup,
    inventoryId,
    enqueueSnackbar,
    goToList,
    claimMutation,
    onClose,
  ]);

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose}>
      <DialogTitle>Guarda tu inventario</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Para guardar tu borrador necesitas iniciar sesión o crear una cuenta.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSignIn()}
          color="primary"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          Iniciar Sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
};
