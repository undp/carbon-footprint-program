import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/contexts";
import { useCommonNavigation } from "./useCommonNavigation";
import { AppHttpError } from "../../../api/http/errors";

export const useInventoryErrorHandler = (error: Error | null) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { goToList, goToLanding } = useCommonNavigation();
  const goToListOrLanding = user ? goToList : goToLanding;

  useEffect(() => {
    if (!error) return;

    if (error instanceof AppHttpError && error.detail.status === 403) {
      enqueueSnackbar("No tienes permisos para acceder a esta huella", {
        variant: "error",
      });
      goToListOrLanding();
      return;
    }

    if (error instanceof AppHttpError) {
      enqueueSnackbar("No se pudo cargar la huella", { variant: "error" });
    } else {
      enqueueSnackbar("Ocurrió un error inesperado", { variant: "error" });
    }
  }, [error, enqueueSnackbar, goToListOrLanding]);
};
