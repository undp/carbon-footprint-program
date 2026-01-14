from load_methodologies.add_subcategories.add_sucategories import add_subcategory
from load_methodologies.utils.savers import write_json
from load_methodologies.utils.create_json_from_df import parse_dataframe


def add_categories(
        state,
        df,
        json_data,
        path,
        ):
    """
    Adds categories from a DataFrame into the JSON structure under state.categories_key.

    :param df: DataFrame containing category data
    :param state: Object containing the categories_key attribute
    :param json_data: Dictionary representing the JSON to be updated
    """
    if state.categories_key not in json_data:
        json_data[0][state.categories_key] = []

    for _, row in df[state.categories_sheet_key].iterrows():

        category = parse_dataframe(
            row, 
            key_mapping=state.category_map,
            extra_fields=state.category_extra_attributes
            )[0]

        category[state.subcategories_sheet_key] = add_subcategory(
            state,
            category.get(state.json_category_name_value),
            df[state.subcategories_sheet_key],
            df[state.emission_factors_sheet_key],
            df[state.measurement_units_key],
            )

        json_data[0][state.categories_sheet_key].append(category)

        path and write_json(json_data, path)

    return json_data