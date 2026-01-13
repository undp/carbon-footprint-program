from load_methodologies.add_subcategories.add_details_factors_dimentions import build_detail_factors_dimentions
from load_methodologies.add_subcategories.add_factors_values import add_factors_values
from load_methodologies.utils.create_json_from_df import parse_dataframe

def add_subcategory(
        state,
        category, 
        df_subcategories,
        df_factors,
        df_units,
        ):
    """
    Builds a subcategories dictionary for a given category.

    :param category: Category name used to filter subcategories.
    :param df_subcategories: DataFrame containing subcategories data.
    :param state: Object containing column name configuration.
    :return: Dictionary with subcategories information.
    """
    
    subcategories = []
    filtered_df = df_subcategories[
        df_subcategories[state.catergory_name_excel_value] == category
    ]

    for _, row in filtered_df.iterrows():

        subcategory = parse_dataframe(
            row, 
            key_mapping=state.subcategory_map,
            extra_fields=state.category_extra_attributes,
            excluded_cols=state.subcategory_excluded_cols
            )[0]
        subcategory[state.json_factor_dimention_key] = build_detail_factors_dimentions(
            state,
            row.get(state.subcategory_detail_column),
            row.get(state.subcatergory_name_excel_value)
        )
        subcategory[state.json_factor_values_key] = add_factors_values(state, df_subcategories, df_factors, df_units, row.get(state.subcatergory_name_excel_value))
        subcategories.append(subcategory)

    return subcategories