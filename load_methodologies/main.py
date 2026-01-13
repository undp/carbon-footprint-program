from load_methodologies.environment import State
from load_methodologies.add_categories import add_categories
from load_methodologies.utils.savers import write_json
from load_methodologies.utils.load_sheets_excel import read_excel_sheets
from load_methodologies.utils.create_json_from_df import parse_dataframe
from typing import Dict, Any, List

def build_methodology(
        state,
        dataframe,
        ) -> List[Dict[str, Any]]:
    """
    Builds a methodology payload list using the provided stateuration.

    :param state: Methodologystate class containing methodology attributes.
    :return: List containing a single methodology dictionary.
    """
    methodology = parse_dataframe(
        df=dataframe,
        key_mapping=state.methodology_columns_map,
    )
    methodology[0][state.categories_key] = []
    return methodology


def main() -> None:
    """
    Main execution function.
    Reads the Excel file and processes the subcategories detail column.
    """
    state = State()

    dataframes = read_excel_sheets(
        file_path=state.methodologies_excel,
        sheet_names=state.sheet_names
    )

    methodology = build_methodology(state, dataframes[state.methodology_sheet_key])
    add_categories(state, dataframes, methodology, state.json_path)

    parse_dataframe(
        df=dataframes[state.measurement_units_key],
        key_mapping=state.measurement_units_map,
        path=state.measurement_unit_path
    )

    parse_dataframe(
        df=dataframes[state.rate_measurement_units_key],
        path=state.rate_measurement_unit_path
    )

if __name__ == "__main__":
    main()