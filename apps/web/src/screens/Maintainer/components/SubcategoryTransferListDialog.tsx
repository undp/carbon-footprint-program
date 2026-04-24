import { FC, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";

export interface SubcategoryOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface SubcategoryTransferListDialogProps {
  open: boolean;
  isNew: boolean;
  availableSubcategories: SubcategoryOption[];
  initialSelectedIds: string[];
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
}

const SubcategoryTransferListDialogContent: FC<
  SubcategoryTransferListDialogProps
> = ({
  open,
  isNew,
  availableSubcategories,
  initialSelectedIds,
  onClose,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [filter, setFilter] = useState("");

  const normalizedFilter = filter.trim().toLowerCase();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groupedAvailable = useMemo(() => {
    const filtered = availableSubcategories.filter(
      (sc) =>
        !selectedSet.has(sc.id) &&
        (normalizedFilter === "" ||
          sc.name.toLowerCase().includes(normalizedFilter) ||
          sc.categoryName.toLowerCase().includes(normalizedFilter))
    );
    const groups = new Map<string, SubcategoryOption[]>();
    for (const sc of filtered) {
      const list = groups.get(sc.categoryName) ?? [];
      list.push(sc);
      groups.set(sc.categoryName, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [availableSubcategories, selectedSet, normalizedFilter]);

  const groupedSelected = useMemo(() => {
    const selectedItems = availableSubcategories.filter((sc) =>
      selectedSet.has(sc.id)
    );
    const groups = new Map<string, SubcategoryOption[]>();
    for (const sc of selectedItems) {
      const list = groups.get(sc.categoryName) ?? [];
      list.push(sc);
      groups.set(sc.categoryName, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [availableSubcategories, selectedSet]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const saveDisabled = isNew && selectedIds.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {SUBCATEGORY_RECOMMENDATIONS_LABELS.editSubcategories}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar subcategoría o categoría"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Disponibles
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
              {groupedAvailable.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2 }}
                >
                  No hay subcategorías disponibles
                </Typography>
              ) : (
                groupedAvailable.map(([categoryName, items]) => (
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
                          <ListItemButton onClick={() => toggle(item.id)}>
                            <ListItemIcon>
                              <Checkbox edge="start" checked={false} />
                            </ListItemIcon>
                            <ListItemText primary={item.name} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Seleccionadas ({selectedIds.length})
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
              {groupedSelected.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2 }}
                >
                  Ninguna subcategoría seleccionada
                </Typography>
              ) : (
                groupedSelected.map(([categoryName, items]) => (
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
                          <ListItemButton onClick={() => toggle(item.id)}>
                            <ListItemIcon>
                              <Checkbox edge="start" checked />
                            </ListItemIcon>
                            <ListItemText primary={item.name} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={saveDisabled}
          onClick={() => onSave(selectedIds)}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const SubcategoryTransferListDialog: FC<
  SubcategoryTransferListDialogProps
> = (props) => {
  // Render the content only while open so internal state is reset on each
  // opening via component remount — avoids setState-in-effect patterns.
  if (!props.open) return null;
  return <SubcategoryTransferListDialogContent {...props} />;
};
