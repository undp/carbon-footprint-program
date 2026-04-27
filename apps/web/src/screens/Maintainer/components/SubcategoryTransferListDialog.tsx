import { FC, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useFuzzySearch } from "@/hooks";
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

  const saveDisabled = isNew && selectedIds.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Editar subcategorías</DialogTitle>
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
