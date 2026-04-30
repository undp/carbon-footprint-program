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
    const entity =
      impactedChildren.activeSubsectors > 1
        ? "subrubros asociados"
        : "subrubro asociado";
    const verb =
      impactedChildren.activeSubsectors > 1 ? "eliminarán" : "eliminará";
    items.push(`Se ${verb} ${impactedChildren.activeSubsectors} ${entity}.`);
  }
  if (
    impactedChildren.activeMainActivities !== undefined &&
    impactedChildren.activeMainActivities > 0
  ) {
    const entity =
      impactedChildren.activeMainActivities > 1
        ? "actividades principales asociadas"
        : "actividad principal asociada";
    const verb =
      impactedChildren.activeMainActivities > 1 ? "eliminarán" : "eliminará";
    items.push(
      `Se ${verb} ${impactedChildren.activeMainActivities} ${entity}.`
    );
  }
  if (impactedChildren.organizationData > 0) {
    const entity =
      impactedChildren.organizationData > 1
        ? VOCAB.organization.noun.plural
        : VOCAB.organization.noun.singular;
    const verb = impactedChildren.organizationData > 1 ? "tienen" : "tiene";
    const disclaimer =
      impactedChildren.organizationData > 1
        ? "Estas no se verán afectadas"
        : "Esta no se verá afectada";
    items.push(
      `${impactedChildren.organizationData} ${entity} ${verb} este ${entityLabel} asignado. ${disclaimer}.`
    );
  }
  if (
    impactedChildren.subcategoryRecommendations !== undefined &&
    impactedChildren.subcategoryRecommendations > 0
  ) {
    const entity =
      impactedChildren.subcategoryRecommendations > 1
        ? "recomendaciones de subcategorías asociadas"
        : "recomendación de subcategorías asociada";
    const verb =
      impactedChildren.subcategoryRecommendations > 1
        ? "eliminarán"
        : "eliminará";
    items.push(
      `Se ${verb} ${impactedChildren.subcategoryRecommendations} ${entity}.`
    );
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{`Eliminar ${entityLabel}`}</DialogTitle>
      <DialogContent>
        <DialogContentText color="textPrimary">
          {items.length > 0
            ? `Este ${entityLabel} tiene dependencias activas. `
            : ""}
          ¿Estás seguro de que deseas eliminarlo?
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
