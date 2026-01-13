import pandas as pd
import json

def add_factors_values(
        state,
        df_subcategories,
        df_factors,
        df_units,
        sub_category_name
    ):
    factors_values = []
    filtered_df = df_factors[
        (df_factors[state.subcatergory_name_excel_value] == sub_category_name) &
        (df_factors[state.excel_gas_name_column] == state.co2eq_value)
    ]

    for _, row in filtered_df.iterrows():

        if pd.isna(row["valor"]):
            continue

        subcategory_detail = df_subcategories[
            (df_subcategories[state.subcatergory_name_excel_value] == sub_category_name)
        ][state.subcategory_detail_column]
        if pd.isna(subcategory_detail.iloc[0]):
            continue

        detail_dict = json.loads(subcategory_detail.iloc[0])
        dimension_value_1 = None
        subcategory_1 = None
        subcategory_2 = None
        for key, value in detail_dict.items():
            position = value.get("position")

            if position == 1:
                subcategory_1 = key
            elif position == 2:
                subcategory_2 = key

        if row.get("variable_1") not in (None, "-") and not pd.isna(row["variable_1"]):
            dimension_value_1 = {
                "dimensionCode": f"{sub_category_name}_{subcategory_1}",
                "valueName": row["variable_1"],
            }

        dimension_value_2 = None
        if row.get("variable_2") not in (None, "-") and not pd.isna(row["variable_2"]):
            dimension_value_2 = {
                "dimensionCode": f"{sub_category_name}_{subcategory_2}",
                "valueName": row["variable_2"],
            }

        abbreviation = df_units.loc[df_units["name"] == row["unit"], "abbreviation"].iloc[0]
        factor_value = {
            "dimensionValue1": dimension_value_1,
            "dimensionValue2": dimension_value_2,
            "rateMeasurementUnitAbbreviation": f"kg/{abbreviation}",
            "source": row["source"],
            "value": float(row["valor"]),
        }

        factors_values.append(factor_value)

    return factors_values
