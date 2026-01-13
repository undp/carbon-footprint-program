import pandas as pd
from typing import Dict

def read_excel_sheets(
    file_path: str,
    sheet_names: Dict[str, str]
) -> Dict[str, pd.DataFrame]:
    """
    Reads multiple sheets from an Excel file.

    :param file_path: Full path to the Excel file.
    :param sheet_names: Dictionary mapping logical names to Excel sheet names.
    :return: Dictionary of DataFrames keyed by logical sheet names.
    """
    return {
        logical_name: pd.read_excel(file_path, sheet_name=excel_name)
        for logical_name, excel_name in sheet_names.items()
    }