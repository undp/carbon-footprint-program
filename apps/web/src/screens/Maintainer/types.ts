export interface Methodology {
  id: string;
  nombre: string;
  descripcion: string;
  normativa: string;
  version: string;
  activo: boolean;
}


export interface MaintainerState {
  editingMethodology: { id: string; nombre: string; normativa: string } | null;
  startEditing: (methodology: {
    id: string;
    nombre: string;
    normativa: string;
  }) => void;
  stopEditing: () => void;
}

export interface SelectOption {
  label: string;
  value: string;
}
