import { FC } from "react";
import {
  Box,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import type { SubcategoryOption } from "./SubcategoryTransferListDialog";

export type SubcategoryGroup = {
  categoryName: string;
  items: SubcategoryOption[];
};

interface SubcategoryTransferColumnProps {
  title: string;
  emptyText: string;
  groups: SubcategoryGroup[];
  checked: boolean;
  onToggle: (id: string) => void;
}

export const SubcategoryTransferColumn: FC<SubcategoryTransferColumnProps> = ({
  title,
  emptyText,
  groups,
  checked,
  onToggle,
}) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          maxHeight: 420,
          overflow: "auto",
        }}
      >
        {groups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {emptyText}
          </Typography>
        )}
        {groups.length > 0 &&
          groups.map(({ categoryName, items }) => (
            <Box key={categoryName}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  bgcolor: "grey.100",
                }}
              >
                {categoryName}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton onClick={() => onToggle(item.id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={checked}
                          tabIndex={-1}
                          inputProps={{ "aria-label": item.name }}
                        />
                      </ListItemIcon>
                      <ListItemText primary={item.name} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
      </Box>
    </Box>
  );
};
