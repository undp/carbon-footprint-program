import { FC, SyntheticEvent } from "react";
import { Tab, Tabs } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/admin/users";
import { TAB_LABELS, type TabKey } from "../constants";

interface UsersScreenTabsProps {
  activeTab: TabKey;
}

export const UsersScreenTabs: FC<UsersScreenTabsProps> = ({ activeTab }) => {
  const navigate = useNavigate({ from: Route.fullPath });

  const handleChange = (_event: SyntheticEvent, value: TabKey) => {
    void navigate({ search: (prev) => ({ ...prev, tab: value }) });
  };

  return (
    <Tabs value={activeTab} onChange={handleChange} sx={{ mb: 1 }}>
      {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
        <Tab key={key} value={key} label={TAB_LABELS[key]} />
      ))}
    </Tabs>
  );
};
