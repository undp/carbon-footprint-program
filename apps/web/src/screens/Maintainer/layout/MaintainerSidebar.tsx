import { FC, useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Toolbar,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  DashboardOutlined,
  MenuBookOutlined,
  CategoryOutlined,
  TuneOutlined,
  HistoryOutlined,
  ExpandMore,
  ChevronRight,
  ScienceOutlined,
  AccountTreeOutlined,
  Co2Outlined,
  SquareFootOutlined,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { HuellaLatamLogo } from "@icons/HuellaLatamLogo";

interface Props {
  width: number;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children?: { label: string; path: string; disabled?: boolean }[];
  path?: string;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard Admin",
    icon: <DashboardOutlined />,
    disabled: true,
  },
  {
    label: "Metodologías",
    icon: <MenuBookOutlined />,
    path: Routes.MAINTAINER_METHODOLOGIES,
    children: [
      {
        label: "Categorías/Alcances",
        path: Routes.MAINTAINER_SCOPES,
      },
      {
        label: "Sub-categorías",
        path: Routes.MAINTAINER_SUBCATEGORIES,
      },
      {
        label: "Factores de emisión",
        path: Routes.MAINTAINER_EMISSION_FACTORS,
      },
      {
        label: "Unidades",
        path: Routes.MAINTAINER_UNITS,
        disabled: true,
      },
    ],
  },
  {
    label: "Rubros",
    icon: <CategoryOutlined />,
    disabled: true,
    children: [{ label: "Actividades", path: "#", disabled: true }],
  },
  {
    label: "Parámetros",
    icon: <TuneOutlined />,
    disabled: true,
    children: [
      { label: "Unidades", path: "#", disabled: true },
      { label: "Alias", path: "#", disabled: true },
    ],
  },
  {
    label: "Historial de cambios",
    icon: <HistoryOutlined />,
    disabled: true,
  },
];

export const MaintainerSidebar: FC<Props> = ({ width }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Metodologías: true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const selectedBg = alpha(theme.palette.secondary.main, 0.2);
  const selectedColor = theme.palette.primary.main;

  const SUB_ICONS: Record<string, React.ReactNode> = {
    "Categorías/Alcances": <ScienceOutlined fontSize="small" />,
    "Sub-categorías": <AccountTreeOutlined fontSize="small" />,
    "Factores de emisión": <Co2Outlined fontSize="small" />,
    Unidades: <SquareFootOutlined fontSize="small" />,
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          px: 1,
          gap: 1,
        },
      }}
    >
      <Toolbar>
        <HuellaLatamLogo sx={{ width: 93, height: 40 }} />
      </Toolbar>
      <Divider variant="middle" />
      <List sx={{ pt: 1 }}>
        {NAV_GROUPS.map((group) => {
          const hasChildren = group.children && group.children.length > 0;
          const isOpen = openGroups[group.label] ?? false;
          const isParentActive =
            group.path != null && isActive(group.path);

          return (
            <div key={group.label}>
              <ListItemButton
                disabled={group.disabled}
                onClick={() => {
                  if (hasChildren) {
                    if (!isOpen) {
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.label]: true,
                      }));
                    } else if (!group.path) {
                      toggleGroup(group.label);
                    }
                  }
                  if (group.path) {
                    void navigate({ to: group.path });
                  }
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 40,
                  ...(isParentActive && {
                    backgroundColor: selectedBg,
                    color: selectedColor,
                    "& .MuiListItemIcon-root": {
                      color: selectedColor,
                    },
                    "& .MuiListItemText-primary": {
                      color: selectedColor,
                      fontWeight: 600,
                    },
                    "&:hover": {
                      backgroundColor: selectedBg,
                    },
                  }),
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{group.icon}</ListItemIcon>
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                />
                {hasChildren &&
                  (isOpen ? (
                    <ExpandMore fontSize="small" />
                  ) : (
                    <ChevronRight fontSize="small" />
                  ))}
              </ListItemButton>

              {hasChildren && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {group.children!.map((child) => (
                      <ListItemButton
                        key={child.label}
                        component={Link}
                        to={child.path}
                        disabled={child.disabled}
                        selected={isActive(child.path)}
                        sx={{
                          pl: 4,
                          borderRadius: 2,
                          mb: 0.5,
                          minHeight: 36,
                          "&.Mui-selected": {
                            backgroundColor: selectedBg,
                            color: selectedColor,
                            "& .MuiListItemIcon-root": {
                              color: selectedColor,
                            },
                            "& .MuiListItemText-primary": {
                              color: selectedColor,
                              fontWeight: 600,
                            },
                            "&:hover": {
                              backgroundColor: selectedBg,
                            },
                          },
                        }}
                      >
                        {SUB_ICONS[child.label] && (
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            {SUB_ICONS[child.label]}
                          </ListItemIcon>
                        )}
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: isActive(child.path) ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </div>
          );
        })}
      </List>
    </Drawer>
  );
};
