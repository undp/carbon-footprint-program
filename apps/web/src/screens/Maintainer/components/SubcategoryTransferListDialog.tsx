import { FC, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Typography,
  CircularProgress,
  Divider,
  Box,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useSubcategories, useCategories } from "@/api/query/maintainer";
import { useMethodologies } from "@/api/query/maintainer";
import { MethodologyVersionStatus } from "@repo/types";

interface SubcategoryTransferListDialogProps {
  open: boolean;
  isNew: boolean;
  selectedIds: number[];
  onSave: (subcategoryIds: number[]) => void;
  onClose: () => void;
}

export const SubcategoryTransferListDialog: FC<
  SubcategoryTransferListDialogProps
> = ({ open, isNew, selectedIds, onSave, onClose }) => {
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(selectedIds)
  );

  const { data: methodologies, isLoading: isLoadingMethodologies } =
    useMethodologies();
  const activeMethodologyVersionId = useMemo(() => {
    return methodologies?.find(
      (m) => m.status === MethodologyVersionStatus.PUBLISHED
    )?.id;
  }, [methodologies]);

  const { data: subcategories, isLoading: isLoadingSubcategories } =
    useSubcategories(activeMethodologyVersionId);
  const { data: categories, isLoading: isLoadingCategories } = useCategories(
    activeMethodologyVersionId
  );

  const grouped = useMemo(() => {
    if (!subcategories || !categories) return [];
    return categories.map((category) => ({
      category,
      subcategories: subcategories.filter((s) => s.category.id === category.id),
    }));
  }, [subcategories, categories]);

  const handleToggle = (subcategoryId: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return next;
    });
  };

  const isLoading =
    isLoadingMethodologies || isLoadingSubcategories || isLoadingCategories;
  const isSaveDisabled = isNew && checked.size === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 600 }}>
        Seleccionar subcategorías
      </DialogTitle>
      <IconButton
        aria-label="cerrar"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Disponibles
              </Typography>
              <List
                dense
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {grouped.map(({ category, subcategories: subs }) =>
                  subs.length === 0 ? null : (
                    <Box key={category.id}>
                      <ListItem sx={{ bgcolor: "grey.100" }}>
                        <ListItemText
                          primary={category.name}
                          slotProps={{
                            primary: { variant: "caption", fontWeight: 600 },
                          }}
                        />
                      </ListItem>
                      {subs.map((sub) => (
                        <ListItemButton
                          key={sub.id}
                          onClick={() => handleToggle(Number(sub.id))}
                          dense
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              edge="start"
                              checked={checked.has(Number(sub.id))}
                              tabIndex={-1}
                              disableRipple
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={sub.name}
                            slotProps={{ primary: { variant: "body2" } }}
                          />
                        </ListItemButton>
                      ))}
                      <Divider />
                    </Box>
                  )
                )}
                {grouped.every(
                  ({ subcategories: subs }) => subs.length === 0
                ) && (
                  <ListItem>
                    <ListItemText
                      primary="No hay subcategorías disponibles"
                      slotProps={{
                        primary: { variant: "body2", color: "text.secondary" },
                      }}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid size={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Seleccionadas ({checked.size})
              </Typography>
              <List
                dense
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {Array.from(checked).map((id) => {
                  const sub = subcategories?.find((s) => Number(s.id) === id);
                  return sub ? (
                    <ListItemButton
                      key={id}
                      onClick={() => handleToggle(id)}
                      dense
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked
                          tabIndex={-1}
                          disableRipple
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={sub.name}
                        slotProps={{ primary: { variant: "body2" } }}
                      />
                    </ListItemButton>
                  ) : null;
                })}
                {checked.size === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="Ninguna seleccionada"
                      slotProps={{
                        primary: { variant: "body2", color: "text.secondary" },
                      }}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={() => onSave(Array.from(checked))}
          variant="contained"
          disabled={isSaveDisabled}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
