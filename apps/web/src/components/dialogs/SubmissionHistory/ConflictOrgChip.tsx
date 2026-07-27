import { FC, useState } from "react";
import { Box, Collapse, Stack, Typography, useTheme } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import { StatusChip } from "@/components/StatusChip";
import { COLLISION_STATE_CONFIG } from "@/labels/chips/collisionState";
import type { CollisionWarning } from "./collisionWarnings";
import { ConflictComparison } from "./ConflictComparison";

type Props = {
  collision: CollisionWarning;
};

export const ConflictOrgChip: FC<Props> = ({ collision }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { metadata, message } = collision;

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
        spacing={1}
        onClick={() => setExpanded((value) => !value)}
        sx={{ cursor: "pointer", px: 1, py: 0.75 }}
      >
        <StatusChip
          config={COLLISION_STATE_CONFIG[metadata.collisionState]}
          size="small"
        />
        <Typography variant="caption" fontWeight={600} sx={{ flexShrink: 0 }}>
          {metadata.taxId ?? `Sin ${TAX_ID_LABEL_SHORT}`}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ flex: 1, minWidth: 0 }}
        >
          {metadata.legalName}
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
