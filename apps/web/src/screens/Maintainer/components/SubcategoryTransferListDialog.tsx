import { FC, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { useFuzzySearch } from "@/hooks";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";
import {
  SubcategoryTransferColumn,
  type SubcategoryGroup,
} from "./SubcategoryTransferColumn";

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
  sectorName: string;
  subsectorName: string | null;
  nullSubsectorLabel: string;
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
}

const groupByCategory = (
  subcategories: SubcategoryOption[]
): SubcategoryGroup[] => {
  const map = new Map<string, SubcategoryOption[]>();
  for (const sc of subcategories) {
    const list = map.get(sc.categoryName) ?? [];
    list.push(sc);
    map.set(sc.categoryName, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([categoryName, items]) => ({ categoryName, items }));
};

const SubcategoryTransferListDialogContent: FC<
  SubcategoryTransferListDialogProps
> = ({
  open,
  isNew,
  availableSubcategories,
  initialSelectedIds,
  sectorName,
  subsectorName,
  nullSubsectorLabel,
  onClose,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [filter, setFilter] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const availableItems = useMemo(
    () => availableSubcategories.filter((sc) => !selectedSet.has(sc.id)),
    [availableSubcategories, selectedSet]
  );

  const { results: filteredAvailable } = useFuzzySearch(availableItems, {
    query: filter,
    fuseOptions: { keys: ["name", "categoryName"] },
  });

  const groupedAvailable = useMemo(
    () => groupByCategory(filteredAvailable),
    [filteredAvailable]
  );

  const groupedSelected = useMemo(() => {
    const selectedItems = availableSubcategories.filter((sc) =>
      selectedSet.has(sc.id)
    );
    return groupByCategory(selectedItems);
  }, [availableSubcategories, selectedSet]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return [...set];
    });
  };

  const isDirty = useMemo(() => {
    const initialSet = new Set(initialSelectedIds);
    if (initialSet.size !== selectedIds.length) return true;
    for (const id of selectedIds) {
      if (!initialSet.has(id)) return true;
    }
    return false;
  }, [initialSelectedIds, selectedIds]);

  const saveDisabled = isNew ? selectedIds.length === 0 : !isDirty;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { sx: { height: "80vh" } },
      }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        {SUBCATEGORY_RECOMMENDATIONS_LABELS.editSubcategoriesTitle}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: 1,
            rowGap: 1,
            my: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Sector
          </Typography>
          <Typography variant="body2">{sectorName}</Typography>
          <Typography variant="body2" color="text.secondary">
            Subsector
          </Typography>
          <Typography variant="body2">
            {subsectorName ?? nullSubsectorLabel}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder={SUBCATEGORY_RECOMMENDATIONS_LABELS.searchPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              endAdornment:
                filter.length > 0 ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={
                        SUBCATEGORY_RECOMMENDATIONS_LABELS.clearSearchAriaLabel
                      }
                      onClick={() => setFilter("")}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
            },
          }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          <SubcategoryTransferColumn
            title="Disponibles"
            emptyText="No hay subcategorías disponibles"
            groups={groupedAvailable}
            checked={false}
            onToggle={toggle}
          />
          <SubcategoryTransferColumn
            title={`Seleccionadas (${selectedIds.length})`}
            emptyText="Ninguna subcategoría seleccionada"
            groups={groupedSelected}
            checked
            onToggle={toggle}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={saveDisabled}
          onClick={() => onSave(selectedIds)}
        >
          Seleccionar
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
