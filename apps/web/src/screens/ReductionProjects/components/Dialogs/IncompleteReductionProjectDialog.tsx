import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { ReductionProjectMissingField } from "@repo/utils";

const FIELD_LABELS: Record<ReductionProjectMissingField, string> = {
  [ReductionProjectMissingField.IMPLEMENTATION_DATE]: "fecha de implementación",
  [ReductionProjectMissingField.DESCRIPTION]: "descripción",
  [ReductionProjectMissingField.SUBCATEGORY]: "subcategoría",
  [ReductionProjectMissingField.YEAR]: "año",
  [ReductionProjectMissingField.BASELINE_SCENARIO]: "escenario base",
  [ReductionProjectMissingField.PROJECT_SCENARIO]: "escenario del proyecto",
  [ReductionProjectMissingField.CONSIDERED_GEI]: "GEI considerados",
  [ReductionProjectMissingField.GWP_USED]:
    "potencial de calentamiento global (PCG)",
  [ReductionProjectMissingField.REPORTED_ELSEWHERE_DESCRIPTION]:
    "detalle del reporte en otra iniciativa",
};

interface IncompleteReductionProjectDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: ReductionProjectMissingField[];
}

export const IncompleteReductionProjectDialog: FC<
  IncompleteReductionProjectDialogProps
> = ({ open, onClose, missingFields }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="incomplete-reduction-project-dialog-title"
      aria-describedby="incomplete-reduction-project-dialog-description"
    >
      <DialogTitle id="incomplete-reduction-project-dialog-title">
        Proyecto de reducción incompleto
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="incomplete-reduction-project-dialog-description">
          No es posible postular este proyecto porque le faltan los siguientes
          datos:{" "}
          <strong>
            {missingFields.map((field) => FIELD_LABELS[field]).join(", ")}
          </strong>
          . Por favor, edite el proyecto para completar esta información antes
          de continuar.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus>
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};
