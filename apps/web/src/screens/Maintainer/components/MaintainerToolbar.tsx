import { FC, useState } from "react";
import { Badge, Box, Menu, MenuItem, Tooltip } from "@mui/material";
import {
  ExportCsv,
  FilterPanelTrigger,
  Toolbar,
  ToolbarButton,
} from "@mui/x-data-grid";
import FilterListIcon from "@mui/icons-material/FilterList";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { formatDateForFileName } from "@repo/utils";
import { SearchBar } from "@/components";

interface MaintainerToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  fileName?: string;
}

export const MaintainerToolbar: FC<MaintainerToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  fileName,
}) => {
  const [exportAnchorEl, setExportAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const exportOpen = Boolean(exportAnchorEl);
  const closeExportMenu = () => setExportAnchorEl(null);

  return (
    <Toolbar>
      <Box sx={{ ml: "auto", minWidth: 240, maxWidth: 360, width: "100%" }}>
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </Box>
      <Tooltip title="Filtros">
        <FilterPanelTrigger
          render={(triggerProps, state) => (
            <ToolbarButton
              {...triggerProps}
              color={state.filterCount > 0 ? "primary" : "default"}
            >
              <Badge
                badgeContent={state.filterCount}
                color="primary"
                variant="dot"
              >
                <FilterListIcon fontSize="small" />
              </Badge>
            </ToolbarButton>
          )}
        />
      </Tooltip>

      <Tooltip title="Exportar">
        <ToolbarButton
          onClick={(event) =>
            setExportAnchorEl((prev) =>
              prev ? null : (event.currentTarget as HTMLButtonElement)
            )
          }
          aria-label="Exportar"
          aria-haspopup="true"
          aria-controls={exportOpen ? "maintainer-export-menu" : undefined}
          aria-expanded={exportOpen}
        >
          <SaveAltIcon fontSize="small" />
        </ToolbarButton>
      </Tooltip>
      <Menu
        id="maintainer-export-menu"
        anchorEl={exportAnchorEl}
        open={exportOpen}
        onClose={closeExportMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <ExportCsv
          options={{
            utf8WithBom: true,
            fileName: fileName
              ? `${fileName}_${formatDateForFileName()}`
              : undefined,
          }}
          render={<MenuItem onClick={closeExportMenu} />}
        >
          Descargar como CSV
        </ExportCsv>
      </Menu>
    </Toolbar>
  );
};
