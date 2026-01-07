export interface SubcategoryItem {
  id: string;
  name: string;
  description?: string | null;
  included: boolean; // to check if the subcategory is included in the carbon inventory
  edited: boolean; // to disable the subcategory if it has been edited
}

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  description?: string | null;
  synonyms?: string | null;
  position: number;
  subcategories: SubcategoryItem[];
}
