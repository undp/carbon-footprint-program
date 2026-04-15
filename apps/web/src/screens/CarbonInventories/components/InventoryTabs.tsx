import { FC, SyntheticEvent } from "react";
import { Tabs, Tab, Box, Button } from "@mui/material";
import {
  EditNoteOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";

interface InventoryTabsProps {
  activeTab: number;
  onTabChange: (event: SyntheticEvent, newValue: number) => void;
  onNewInventory: () => void;
}

export const InventoryTabs: FC<InventoryTabsProps> = ({
  activeTab,
  onTabChange,
  onNewInventory,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <Tabs
      value={activeTab}
      onChange={onTabChange}
      sx={(theme) => ({
        minHeight: 0,
        "& .MuiTabs-indicator": {
          backgroundColor: theme.palette.primary.main,
          height: 2,
        },
        "& .MuiTab-root": {
          textTransform: "none",
          minHeight: 46,
          fontWeight: 500,
          fontSize: "0.875rem",
          color: theme.palette.text.secondary,
          gap: 1,
          "&.Mui-selected": {
            color: theme.palette.primary.dark,
          },
        },
      })}
    >
      <Tab
        icon={<EditNoteOutlined fontSize="medium" />}
        iconPosition="start"
        label="Borradores"
      />
      <Tab
        icon={<WorkspacePremiumOutlined fontSize="medium" />}
        iconPosition="start"
        label="Huellas autodeclaradas"
      />
    </Tabs>

    <Box className="flex flex-row items-center gap-4 px-6">
      <Button
        variant="contained"
        color="primary"
        size="small"
        onClick={onNewInventory}
      >
        Nueva Huella
      </Button>
    </Box>
  </Box>
);
