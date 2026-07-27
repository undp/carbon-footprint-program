import { FC, Fragment } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import type {
  CollisionField,
  OrganizationIdentityCollisionMetadata,
} from "@repo/types";

type Props = {
  metadata: OrganizationIdentityCollisionMetadata;
};

const FIELD_ROWS: { field: CollisionField; label: string }[] = [
  { field: "tradeName", label: "Nombre comercial" },
  { field: "legalName", label: "Razón social" },
  { field: "taxId", label: TAX_ID_LABEL_SHORT },
];

/**
 * Side-by-side comparison of the applicant and one conflicting organization over
 * the three identity fields. The colliding field(s) (from `collisionFields`) are
 * highlighted. Both sides come from the warning payload — the applicant tuple is
 * the snapshot the API actually compared, not the organization's displayed data.
 * Uses a 3-column grid with wrapping cells so it scales to any value length
 * without overflowing the dialog horizontally.
 */
export const ConflictComparison: FC<Props> = ({ metadata }) => {
  const theme = useTheme();
  const collisionFields = new Set<CollisionField>(metadata.collisionFields);

  const applicantValues: Record<CollisionField, string | null> = {
    tradeName: metadata.applicant.tradeName,
    legalName: metadata.applicant.legalName,
    taxId: metadata.applicant.taxId,
  };
  const conflictValues: Record<CollisionField, string | null> = {
    tradeName: metadata.tradeName,
    legalName: metadata.legalName,
    taxId: metadata.taxId,
  };

  const cellSx = (collides: boolean) => ({
    borderRadius: "4px",
    px: 1,
    py: 0.5,
    fontSize: "0.75rem",
    overflowWrap: "anywhere" as const,
    bgcolor: collides ? alpha(theme.palette.warning.main, 0.18) : "transparent",
    border: collides
      ? `1px solid ${alpha(theme.palette.warning.main, 0.5)}`
      : `1px solid transparent`,
    color: collides ? theme.palette.warning.dark : theme.palette.text.primary,
    fontWeight: collides ? 600 : 400,
  });

  const headerSx = {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
  } as const;

  return (
    <Box
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.default,
        p: 1.5,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(88px, 0.8fr) 1fr 1fr",
          columnGap: 1,
          rowGap: 0.5,
          alignItems: "center",
        }}
      >
        <Box />
        <Typography sx={headerSx}>Esta postulación</Typography>
        <Typography sx={headerSx}>Organización en conflicto</Typography>

        {FIELD_ROWS.map(({ field, label }) => {
          const collides = collisionFields.has(field);
          return (
            <Fragment key={field}>
              <Typography
                sx={{ fontSize: "0.7rem", color: theme.palette.text.secondary }}
              >
                {label}
              </Typography>
              <Box sx={cellSx(collides)}>{applicantValues[field] || "-"}</Box>
              <Box sx={cellSx(collides)}>{conflictValues[field] || "-"}</Box>
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
};
