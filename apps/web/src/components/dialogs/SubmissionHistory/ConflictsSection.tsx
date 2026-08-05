import { FC, useMemo } from "react";
import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { SubmissionStatus } from "@repo/types";
import { useGetSubmissionWarnings } from "@/api/query/submissions/useGetSubmissionWarnings";
import { parseCollisionWarnings } from "./collisionWarnings";
import { ConflictRow } from "./ConflictRow";

type Props = {
  submissionId: string | null | undefined;
  submissionStatus: SubmissionStatus | null;
  isOrganizationAccreditation: boolean;
  /**
   * Whether the viewer may read the admin-only warnings endpoint. Required, and
   * deliberately not defaulted: the trust boundary belongs here, not in the
   * route topology that happens to render this dialog.
   */
  canViewWarnings: boolean;
};

const COLLISION_LEAD =
  "La identidad de esta postulación coincide con la de otras organizaciones.";

/**
 * The section's subtitle, which depends on whether the submission can still be
 * acted on. Only a `PENDING` submission can be approved, rejected or returned
 * with observations — the API's status transition filters on `PENDING` — so for
 * any other status the copy must not offer an approval that is no longer
 * available: an already-approved postulation keeps showing its conflicts, but as
 * a record of what was approved rather than as input to a pending decision.
 *
 * The exact status is not named here; the `CurrentStatusBanner` right above the
 * section already carries it.
 */
const subtitleFor = (status: SubmissionStatus | null): string =>
  status === SubmissionStatus.PENDING
    ? `${COLLISION_LEAD} Esta información es solo referencial: puedes aprobar la solicitud de todas formas.`
    : `${COLLISION_LEAD} Esta postulación ya no está pendiente de revisión, así que la coincidencia queda solo como antecedente.`;

/**
 * "Conflictos detectados" — surfaces identity-collision warnings for an
 * organization-accreditation submission. Renders nothing unless the viewer may
 * read them AND the submission is an accreditation AND at least one collision
 * warning exists.
 *
 * The list is flat and numbered ("Conflicto 1", "Conflicto 2") so a reviewer can
 * point at one out loud. It keeps the API's order: collisions against an approved
 * submission first, then pending ones, then requests returned with observations.
 */
export const ConflictsSection: FC<Props> = ({
  submissionId,
  submissionStatus,
  isOrganizationAccreditation,
  canViewWarnings,
}) => {
  const theme = useTheme();

  // `admin/submissions/:id/warnings` is ADMIN/SUPERADMIN-only, so the query is
  // gated on the caller's permission as well as on the submission being an
  // accreditation with a concrete id. Without the gate an org-user surface
  // rendering this dialog would fire 403s (and TanStack Query would retry them).
  const enabledId =
    canViewWarnings && isOrganizationAccreditation && submissionId
      ? submissionId
      : undefined;
  const { data } = useGetSubmissionWarnings(enabledId);

  const collisions = useMemo(() => parseCollisionWarnings(data), [data]);

  if (!canViewWarnings || !isOrganizationAccreditation) return null;
  if (collisions.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2,
        background: alpha(theme.palette.warning.main, 0.1),
        border: `1px solid ${alpha(theme.palette.warning.light, 0.6)}`,
        borderRadius: "10px",
        p: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <WarningAmberOutlined
          sx={{ color: theme.palette.warning.dark, fontSize: 20 }}
        />
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ color: theme.palette.warning.dark }}
        >
          Conflictos detectados
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 1.5,
          color: theme.palette.text.secondary,
        }}
      >
        {subtitleFor(submissionStatus)}
      </Typography>

      <Stack spacing={1}>
        {collisions.map((metadata, index) => (
          // One organization can yield several warnings in the same state — one
          // per snapshot whose colliding fields no other snapshot covers — so the
          // fields are part of the identity of a row, not just the org and state.
          <ConflictRow
            key={`${metadata.collisionState}-${metadata.organizationId}-${metadata.collisionFields.join("-")}`}
            metadata={metadata}
            position={index + 1}
          />
        ))}
      </Stack>
    </Box>
  );
};
