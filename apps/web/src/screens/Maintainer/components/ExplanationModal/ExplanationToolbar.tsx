import { FC, MouseEvent, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { ExplanationHelpPopover } from "./ExplanationHelpPopover";
import {
  buildHeadingSpec,
  HEADING_LEVELS,
  HeadingLevel,
  TOOLBAR_ACTIONS,
  ToolbarAction,
  ToolbarInsertSpec,
} from "./constants";

interface ExplanationToolbarProps {
  onInsert: (spec: ToolbarInsertSpec) => void;
  disabled?: boolean;
}

export const ExplanationToolbar: FC<ExplanationToolbarProps> = ({
  onInsert,
  disabled = false,
}) => {
  const [headingAnchor, setHeadingAnchor] = useState<HTMLElement | null>(null);
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);

  const insert = (spec: ToolbarInsertSpec) => {
    if (disabled) return;
    onInsert(spec);
  };

  const handleActionClick = (
    action: ToolbarAction,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    if (action.id === "heading") {
      setHeadingAnchor(event.currentTarget);
      return;
    }
    if (action.spec) {
      insert(action.spec);
    }
  };

  const insertHeading = (level: HeadingLevel) => {
    setHeadingAnchor(null);
    insert(buildHeadingSpec(level));
  };

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        flexWrap: "wrap",
        py: 0.5,
        px: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
      })}
    >
      {TOOLBAR_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.id} title={action.tooltip}>
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={(event) => handleActionClick(action, event)}
                aria-label={action.label}
              >
                <Icon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        );
      })}

      <Menu
        anchorEl={headingAnchor}
        open={headingAnchor !== null}
        onClose={() => setHeadingAnchor(null)}
      >
        {HEADING_LEVELS.map((level) => (
          <MenuItem key={level} onClick={() => insertHeading(level)}>
            Encabezado {level}
          </MenuItem>
        ))}
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

      <Tooltip title="Ayuda">
        <span>
          <IconButton
            size="small"
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              setHelpAnchor(event.currentTarget)
            }
            aria-label="Ayuda"
          >
            <HelpOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <ExplanationHelpPopover
        open={helpAnchor !== null}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
      />
    </Box>
  );
};
