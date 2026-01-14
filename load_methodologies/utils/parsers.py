from typing import Dict, Any
import json
import pandas as pd


def parse_json_cell(
    data: Any
    ) -> Dict[str, Any] | None:
    """
    Attempts to parse a cell value as JSON.

    :param data: Cell content from the DataFrame.
    :return: Parsed JSON dictionary if valid, otherwise None.
    """
    if pd.isna(data):
        return {}

    try:
        parsed = json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return {}

    if not isinstance(parsed, dict):
        return {}
    
    return parsed
