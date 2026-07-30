import { FC, useState } from "react";
import { Box, Collapse, Stack, Typography, useTheme } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import { OrganizationDisplayStatusValues } from "@repo/types";
import { StatusChip } from "@/components/StatusChip";
import { ORGANIZATION_DISPLAY_STATUS_CONFIG } from "@/labels/chips/organization";
import type { CollisionWarning } from "./collisionWarnings";
import { ConflictComparison } from "./ConflictComparison";

type Props = {
  collision: CollisionWarning;
  /** 1-based position within the section, shown as "Conflicto N". */
  position: number;
};

export const ConflictOrgChip: FC<Props> = ({ collision, position }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { metadata, message } = collision;

  // The header chip describes the conflicting ORGANIZATION (inscribed or not);
  // the state of the submission it collides with lives in the comparison grid.
  const organizationStatus = metadata.organizationIsAccredited
    ? OrganizationDisplayStatusValues.ACCREDITED
    : OrganizationDisplayStatusValues.NOT_ACCREDITED;

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
        sx={{ cursor: "pointer", px: 1.25, py: 1 }}
      >
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ flexShrink: 0, color: theme.palette.text.secondary }}
        >
          Conflicto {position}
        </Typography>
        <StatusChip
          config={ORGANIZATION_DISPLAY_STATUS_CONFIG[organizationStatus]}
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
