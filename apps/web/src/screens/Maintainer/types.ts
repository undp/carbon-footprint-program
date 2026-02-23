import { Methodology } from "@repo/types";

export interface MaintainerState {
  editingMethodology: Pick<Methodology, "id" | "name" | "regulation"> | null;
  startEditing: (
    methodology: Pick<Methodology, "id" | "name" | "regulation">
  ) => void;
  stopEditing: () => void;
}

export interface SelectOption {
  label: string;
  value: string;
}
