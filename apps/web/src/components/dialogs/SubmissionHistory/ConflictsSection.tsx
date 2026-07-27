import { FC, useMemo } from "react";
import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { capitalize } from "lodash-es";
import type { CollisionState } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { useGetSubmissionWarnings } from "@/api/query/submissions/useGetSubmissionWarnings";
import { parseCollisionWarnings } from "./collisionWarnings";
import { ConflictOrgChip } from "./ConflictOrgChip";

type Props = {
  submissionId: string | null | undefined;
  isOrganizationAccreditation: boolean;
};

const STATE_GROUP_LABEL: Record<CollisionState, string> = {
  APPROVED: `${capitalize(VOCAB.organization.noun.plural)} ${VOCAB.inscription.adjective.plural}`,
  PENDING: "Postulaciones pendientes",
};

// Accredited (APPROVED) collisions are shown before pending ones.
const STATE_ORDER: CollisionState[] = ["APPROVED", "PENDING"];

/**
 * "Conflictos detectados" — surfaces identity-collision warnings for an
 * organization-accreditation submission. Renders nothing unless the submission
 * is an accreditation AND at least one collision warning exists. Warnings are
 * grouped by collision state (accredited first, then pending).
 */
export const ConflictsSection: FC<Props> = ({
  submissionId,
  isOrganizationAccreditation,
}) => {
  const theme = useTheme();

  // Only query for accreditation submissions with a concrete id.
  const enabledId =
    isOrganizationAccreditation && submissionId ? submissionId : undefined;
  const { data } = useGetSubmissionWarnings(enabledId);

  const collisions = useMemo(() => parseCollisionWarnings(data), [data]);

  if (!isOrganizationAccreditation || collisions.length === 0) return null;

  const groups = STATE_ORDER.map((state) => ({
    state,
    items: collisions.filter((c) => c.metadata.collisionState === state),
  })).filter((group) => group.items.length > 0);

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
        La identidad de esta postulación coincide con la de otras
        organizaciones. Revísalo antes de aprobar.
      </Typography>

      <Stack spacing={1.5}>
        {groups.map((group) => (
          <Stack key={group.state} spacing={0.75}>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                fontSize: "0.65rem",
                letterSpacing: 0.4,
              }}
            >
              {STATE_GROUP_LABEL[group.state]}
            </Typography>
            {group.items.map((collision) => (
              <ConflictOrgChip
                key={`${collision.metadata.collisionState}-${collision.metadata.organizationId}`}
                collision={collision}
              />
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};
