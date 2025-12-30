export type SubcategoryItem = {
  id: number;
  name: string;
  description?: string | null;
  selected: boolean;
  hasEditedLine: boolean;
  disabled: boolean;
};

export type CategoryWithSubcategories = {
  id: string;
  name: string;
  description?: string | null;
  synonyms?: string | null;
  order: number;
  subcategories: SubcategoryItem[];
  color?: string;
};
