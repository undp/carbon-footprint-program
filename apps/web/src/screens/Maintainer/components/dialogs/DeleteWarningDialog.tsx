import { FC } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { ProfilingEntityLabel } from "./InUseWarningDialog";
import { VOCAB } from "@/config/vocab";

interface ImpactedChildren {
  activeSubsectors?: number;
  activeMainActivities?: number;
  organizationData: number;
  subcategoryRecommendations?: number;
}

interface Props {
  open: boolean;
  entityLabel: ProfilingEntityLabel;
  impactedChildren: ImpactedChildren;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Pre-delete confirmation dialog for the profiling maintainers. Lists the catalog
 * children that will be soft-deleted along with the row, and the external references
 * (organizations, subcategory recommendations) that will end up pointing to a DELETED
 * row, so the admin can decide informed.
 *
 * Copy never says "cascada" — that's developer jargon. The dialog only lists counts.
 */
export const DeleteWarningDialog: FC<Props> = ({
  open,
  entityLabel,
  impactedChildren,
  onCancel,
  onConfirm,
}) => {
  const items: string[] = [];
  if (
    impactedChildren.activeSubsectors !== undefined &&
    impactedChildren.activeSubsectors > 0
  ) {
    items.push(
      `Se eliminarán ${impactedChildren.activeSubsectors} subrubros activos.`
    );
  }
  if (
    impactedChildren.activeMainActivities !== undefined &&
    impactedChildren.activeMainActivities > 0
  ) {
    items.push(
      `Se eliminarán ${impactedChildren.activeMainActivities} actividades activas.`
    );
  }
  if (impactedChildren.organizationData > 0) {
    items.push(
      `${impactedChildren.organizationData} ${VOCAB.organization.article.plural} tienen este ${entityLabel} asignado.`
    );
  }
  if (
    impactedChildren.subcategoryRecommendations !== undefined &&
    impactedChildren.subcategoryRecommendations > 0
  ) {
    items.push(
      `${impactedChildren.subcategoryRecommendations} recomendaciones apuntan a este ${entityLabel}.`
    );
  }

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{`Eliminar ${entityLabel}`}</DialogTitle>
      <DialogContent>
        <DialogContentText color="textPrimary">
          {`¿Estás seguro de que deseas eliminar este ${entityLabel}?`}
        </DialogContentText>
        {items.length > 0 && (
          <Box
            component="ul"
            sx={{ mt: 1.5, mb: 0, pl: 3, listStyleType: "disc" }}
          >
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
