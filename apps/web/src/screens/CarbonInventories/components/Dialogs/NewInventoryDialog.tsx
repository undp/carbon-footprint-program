import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
} from "@mui/material";
import { FC } from "react";
import { ApplicationFormIcon, CalculatorIcon } from "@/icons";
import { CreateInventoryCard } from "@/components/CreateInventoryCard";
import { grey } from "@mui/material/colors";
import { Close } from "@mui/icons-material";
import { UsageMode } from "@repo/types";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedOrganizationId?: string;
}

export const NewInventoryDialog: FC<Props> = ({
  open,
  onClose,
  selectedOrganizationId,
}) => {
  return (
    <Dialog
      maxWidth="md"
      open={open}
      onClose={onClose}
      disablePortal={false}
      keepMounted={false}
      disableAutoFocus={false}
      disableEnforceFocus={false}
      aria-labelledby="newInventoryDialog-title"
      aria-describedby="newInventoryDialog-description"
    >
      <DialogTitle id="newInventoryDialog-title">Crear huella</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          right: 8,
          top: 8,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>
      <DialogContent>
        <Box
          id="newInventoryDialog-description"
          className="flex flex-row items-center justify-center gap-4"
        >
          <CreateInventoryCard
            AvatarIcon={CalculatorIcon}
            title="Quiero calcular mi huella"
            description="Simula calculando tus emisiones con fuentes relevantes de tu rubro, sin guardar datos."
            buttonText="USAR CALCULADORA"
            usageMode={UsageMode.SIMPLIFIED}
            organizationId={selectedOrganizationId}
            textColor="text.primary"
            iconColor="text.primary"
            backgroundColor={grey[400]}
          />
          <CreateInventoryCard
            AvatarIcon={ApplicationFormIcon}
            title="Ya tengo mis cálculos"
            description="Sube tus datos y genera reportes en segundos."
            buttonText="SUBIR EMISIONES"
            usageMode={UsageMode.EXPERT}
            organizationId={selectedOrganizationId}
            textColor="text.primary"
            iconColor="text.primary"
            backgroundColor={grey[400]}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
