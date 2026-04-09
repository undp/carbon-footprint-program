import { FC, SyntheticEvent } from "react";
import { Tabs, Tab } from "@mui/material";
import {
  EditNoteOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";

interface InventoryTabsProps {
  activeTab: number;
  onTabChange: (event: SyntheticEvent, newValue: number) => void;
}

export const InventoryTabs: FC<InventoryTabsProps> = ({
  activeTab,
  onTabChange,
}) => (
  <Tabs
    value={activeTab}
    onChange={onTabChange}
    sx={(theme) => ({
      minHeight: 0,
      borderTop: `1px solid ${theme.palette.divider}`,
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
      icon={<EditNoteOutlined fontSize="small" />}
      iconPosition="start"
      label="Borradores"
    />
    <Tab
      icon={<WorkspacePremiumOutlined fontSize="small" />}
      iconPosition="start"
      label="Huellas"
    />
  </Tabs>
);
