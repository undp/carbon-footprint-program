import { FC, useState } from "react";
import { Box, Collapse, Stack, Typography, useTheme } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import type { OrganizationIdentityCollisionMetadata } from "@repo/types";
import { buildCollisionMessage } from "./collisionCopy";
import { ConflictComparison } from "./ConflictComparison";

type Props = {
  metadata: OrganizationIdentityCollisionMetadata;
  /** 1-based position within the section, shown as "Conflicto N". */
  position: number;
};

/**
 * One collapsible conflict. The header is only the handle ("Conflicto N" plus
 * the caret): every fact about the conflict — both organizations' standing, both
 * submissions' status and the three identity fields — lives in the comparison
 * grid, so a reviewer reads one surface instead of two.
 */
export const ConflictRow: FC<Props> = ({ metadata, position }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const message = buildCollisionMessage(metadata);

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "8px",
        bgcolor: theme.palette.background.paper,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        onClick={() => setExpanded((value) => !value)}
        sx={{ cursor: "pointer", px: 1.25, py: 1 }}
      >
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: theme.palette.text.secondary }}
        >
          Conflicto {position}
        </Typography>
        <ExpandMoreOutlined
          fontSize="small"
          sx={{
            color: theme.palette.text.secondary,
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            px: 1.5,
            pt: 1,
            color: theme.palette.text.secondary,
          }}
        >
          {message}
        </Typography>
        <ConflictComparison metadata={metadata} />
      </Collapse>
    </Box>
  );
};
