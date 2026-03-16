import { CreateMethodologyResponse } from "@repo/types";

type MethodologyRef = Pick<
  CreateMethodologyResponse,
  "id" | "name" | "regulation"
>;

export interface MaintainerState {
  /** Methodology pre-selected via "Ver Alcances" (selector stays enabled). */
  selectedMethodology: MethodologyRef | null;
  /** Methodology locked via "Editar Alcances" (selector disabled, edit mode). */
  editingMethodology: MethodologyRef | null;
  selectMethodology: (methodology: MethodologyRef) => void;
  startEditing: (methodology: MethodologyRef) => void;
  stopEditing: () => void;
}

export interface SelectOption {
  label: string;
  value: string;
}

export * from "./subcategory";
