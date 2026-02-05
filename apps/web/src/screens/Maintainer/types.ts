export interface MaintainerState {
  editingMethodology: { id: string; name: string; regulation: string } | null;
  startEditing: (methodology: {
    id: string;
    name: string;
    regulation: string;
  }) => void;
  stopEditing: () => void;
}

export interface SelectOption {
  label: string;
  value: string;
}
