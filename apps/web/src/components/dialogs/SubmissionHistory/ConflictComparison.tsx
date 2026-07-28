import { FC, Fragment, ReactNode } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import {
  SubmissionStatus,
  type CollisionField,
  type CollisionState,
  type OrganizationIdentityCollisionMetadata,
} from "@repo/types";
import { StatusChip } from "@/components/StatusChip";
import { SUBMISSION_STATUS_CONFIG } from "@/labels/chips/submission";

type Props = {
  metadata: OrganizationIdentityCollisionMetadata;
};

const IDENTITY_ROWS: { field: CollisionField; label: string }[] = [
  { field: "tradeName", label: "Nombre comercial" },
  { field: "legalName", label: "Razón social" },
  { field: "taxId", label: TAX_ID_LABEL_SHORT },
];

/** The compared snapshot's collision state, as the submission status it means. */
const CONFLICT_SUBMISSION_STATUS: Record<CollisionState, SubmissionStatus> = {
  APPROVED: SubmissionStatus.APPROVED,
  PENDING: SubmissionStatus.PENDING,
};

type ComparisonRow = {
  key: string;
  label: string;
  applicant: ReactNode;
  conflict: ReactNode;
  collides: boolean;
};

/**
 * Side-by-side comparison of the applicant and one conflicting organization: the
 * three identity fields plus the status of each side's submission. The colliding
 * field(s) (from `collisionFields`) are highlighted.
 *
 * Both columns come from the warning payload — the applicant tuple is the
 * snapshot the API actually compared, not the organization's displayed data.
 * Laid out as a grid with wrapping cells and one separator per row, so it scales
 * to any value length without overflowing the dialog horizontally.
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
    ...IDENTITY_ROWS.map(({ field, label }) => ({
      key: field,
      label,
      applicant: applicantValues[field] || "-",
      conflict: conflictValues[field] || "-",
      collides: collisionFields.has(field),
    })),
    {
      key: "submissionStatus",
      label: "Estado de la postulación",
      applicant: (
        <StatusChip
          config={SUBMISSION_STATUS_CONFIG[metadata.applicant.submissionStatus]}
          size="small"
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
        />
      ),
      collides: false,
    },
  ];

  const cellSx = (collides: boolean, isLast: boolean) => ({
    borderRadius: "4px",
    px: 1,
    py: 0.75,
    fontSize: "0.75rem",
    overflowWrap: "anywhere" as const,
    borderBottom: isLast ? "none" : `1px solid ${theme.palette.divider}`,
    bgcolor: collides ? alpha(theme.palette.warning.main, 0.18) : "transparent",
    color: collides ? theme.palette.warning.dark : theme.palette.text.primary,
    fontWeight: collides ? 600 : 400,
  });

  const labelSx = (isLast: boolean) => ({
    py: 0.75,
    pr: 1,
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    borderBottom: isLast ? "none" : `1px solid ${theme.palette.divider}`,
  });

  const headerSx = {
    fontSize: "0.7rem",
    fontWeight: 600,
    pb: 0.75,
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
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
          gridTemplateColumns: "minmax(104px, 0.8fr) 1fr 1fr",
          columnGap: 2,
          rowGap: 0.75,
          alignItems: "center",
        }}
      >
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }} />
        <Typography sx={headerSx}>Esta postulación</Typography>
        <Typography sx={headerSx}>Organización en conflicto</Typography>

        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          return (
            <Fragment key={row.key}>
              <Typography sx={labelSx(isLast)}>{row.label}</Typography>
              <Box sx={cellSx(row.collides, isLast)}>{row.applicant}</Box>
              <Box sx={cellSx(row.collides, isLast)}>{row.conflict}</Box>
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
};
