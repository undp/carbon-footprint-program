export type SubcategoryItem = {
  id: number;
  name: string;
  description?: string;
  selected: boolean;
  hasEditedLine: boolean;
  disabled: boolean;
};

export type CategoryWithSubcategories = {
  id: string;
  name: string;
  description: string;
  synonyms: string;
  order: number;
  subcategories: SubcategoryItem[];
  color?: string;
};
