import { FC, Fragment, ReactNode } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
// `upperFirst`, not `capitalize`: the latter lowercases the rest, turning the
// tax-id label ("RNC") into "Rnc".
import { upperFirst } from "lodash-es";
import {
  SubmissionStatus,
  type CollisionField,
  type CollisionState,
  type OrganizationDisplayStatus,
  type OrganizationIdentityCollisionMetadata,
} from "@repo/types";
import { StatusChip } from "@/components/StatusChip";
import { ORGANIZATION_DISPLAY_STATUS_CONFIG } from "@/labels/chips/organization";
import { SUBMISSION_STATUS_CONFIG } from "@/labels/chips/submission";
import { COLLISION_FIELD_LABELS } from "./collisionCopy";

type Props = {
  metadata: OrganizationIdentityCollisionMetadata;
};

/** Row order of the identity fields; labels come from the shared collision copy. */
const IDENTITY_ROW_ORDER = [
  "tradeName",
  "legalName",
  "taxId",
] as const satisfies readonly CollisionField[];

/** The compared snapshot's collision state, as the submission status it means. */
const CONFLICT_SUBMISSION_STATUS: Record<CollisionState, SubmissionStatus> = {
  APPROVED: SubmissionStatus.APPROVED,
  PENDING: SubmissionStatus.PENDING,
  REVIEWED: SubmissionStatus.REVIEWED,
};

/**
 * An organization's standing chip, read straight from the payload's standing —
 * the app-wide config covers Inscrita / No Inscrita / Bloqueada, so a blocked
 * organization reads as blocked instead of borrowing one of the other two.
 */
const organizationStatusChip = (status: OrganizationDisplayStatus) => (
  <StatusChip
    config={ORGANIZATION_DISPLAY_STATUS_CONFIG[status]}
    size="small"
    fontSize="12px"
  />
);

type ComparisonRow = {
  key: string;
  label: string;
  applicant: ReactNode;
  conflict: ReactNode;
  collides: boolean;
};

/**
 * Side-by-side comparison of the applicant and one conflicting organization. The
 * two status rows come first — the submission each side is represented by, then
 * each organization's own standing (inscribed or not), two facts that must not be
 * read as one — followed by the three identity fields, with the colliding one(s)
 * (from `collisionFields`) highlighted.
 *
 * Both columns come from the warning payload — the applicant tuple is the
 * snapshot the API actually compared, not the organization's displayed data.
 *
 * Laid out as a bordered grid: cells carry the rules themselves, so there is NO
 * grid gap (a gap would break every rule into three floating segments) and no
 * `alignItems: center` on the container (cells must stretch, or a taller cell
 * leaves the neighbouring rules at a different height). Gutters come from cell
 * padding and one vertical rule separates the two compared columns; values wrap
 * inside their cell, so any length fits without scrolling the dialog sideways.
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

  const rows: ComparisonRow[] = [
    {
      key: "submissionStatus",
      label: "Estado de la postulación",
      applicant: (
        <StatusChip
          config={SUBMISSION_STATUS_CONFIG[metadata.applicant.submissionStatus]}
          size="small"
          fontSize="12px"
        />
      ),
      conflict: (
        <StatusChip
          config={
            SUBMISSION_STATUS_CONFIG[
              CONFLICT_SUBMISSION_STATUS[metadata.collisionState]
            ]
          }
          size="small"
          fontSize="12px"
        />
      ),
      collides: false,
    },
    {
      key: "organizationStatus",
      label: "Estado de la organización",
      applicant: organizationStatusChip(metadata.applicant.organizationStatus),
      conflict: organizationStatusChip(metadata.organizationStatus),
      collides: false,
    },
    ...IDENTITY_ROW_ORDER.map((field) => ({
      key: field,
      label: upperFirst(COLLISION_FIELD_LABELS[field]),
      applicant: applicantValues[field] || "-",
      conflict: conflictValues[field] || "-",
      collides: collisionFields.has(field),
    })),
  ];

  const rule = `1px solid ${theme.palette.divider}`;

  const cellSx = (isLast: boolean) => ({
    display: "flex",
    alignItems: "center",
    minHeight: 38,
    px: 1.5,
    py: 1,
    fontSize: "0.75rem",
    overflowWrap: "anywhere" as const,
    borderBottom: isLast ? "none" : rule,
  });

  const labelCellSx = (isLast: boolean) => ({
    ...cellSx(isLast),
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    bgcolor: alpha(theme.palette.text.primary, 0.02),
  });

  const valueCellSx = (
    collides: boolean,
    isLast: boolean,
    isConflictColumn: boolean
  ) => ({
    ...cellSx(isLast),
    borderLeft: isConflictColumn ? rule : "none",
    bgcolor: collides ? alpha(theme.palette.warning.main, 0.16) : "transparent",
    color: collides ? theme.palette.warning.dark : theme.palette.text.primary,
    fontWeight: collides ? 600 : 400,
  });

  const headerCellSx = (isConflictColumn: boolean) => ({
    ...cellSx(false),
    minHeight: 32,
    py: 0.75,
    fontSize: "0.7rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    borderLeft: isConflictColumn ? rule : "none",
    bgcolor: alpha(theme.palette.text.primary, 0.02),
  });

  return (
    <Box sx={{ borderTop: rule, p: 1.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(112px, 0.85fr) 1fr 1fr",
          border: rule,
          borderRadius: "6px",
          overflow: "hidden",
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Box sx={headerCellSx(false)} />
        <Typography sx={headerCellSx(false)}>Esta postulación</Typography>
        <Typography sx={headerCellSx(true)}>
          Organización en conflicto
        </Typography>

        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          return (
            <Fragment key={row.key}>
              <Typography sx={labelCellSx(isLast)}>{row.label}</Typography>
              <Box sx={valueCellSx(row.collides, isLast, false)}>
                {row.applicant}
              </Box>
              <Box sx={valueCellSx(row.collides, isLast, true)}>
                {row.conflict}
              </Box>
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
};
