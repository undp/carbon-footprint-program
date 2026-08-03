import { FC, useMemo } from "react";
import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { useGetSubmissionWarnings } from "@/api/query/submissions/useGetSubmissionWarnings";
import { parseCollisionWarnings } from "./collisionWarnings";
import { ConflictRow } from "./ConflictRow";

type Props = {
  submissionId: string | null | undefined;
  isOrganizationAccreditation: boolean;
};

/**
 * "Conflictos detectados" — surfaces identity-collision warnings for an
 * organization-accreditation submission. Renders nothing unless the submission
 * is an accreditation AND at least one collision warning exists.
 *
 * The list is flat and numbered ("Conflicto 1", "Conflicto 2") so a reviewer can
 * point at one out loud. It keeps the API's order, which puts collisions against
 * an approved submission before collisions against a pending one.
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
        organizaciones. Esta información es solo referencial: puedes aprobar la
        solicitud de todas formas.
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
