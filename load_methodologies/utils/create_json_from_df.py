import pandas as pd
from load_methodologies.utils.savers import write_json

def default_parser(value):
    """
    Parser por defecto para valores individuales
    """
    if pd.isna(value):
        return None

    if isinstance(value, str):
        value_strip = value.strip().lower()

        if value_strip == "true":
            return True
        if value_strip == "false":
            return False

        try:
            return float(value.replace(",", "."))
        except ValueError:
            return value

    return value


import pandas as pd

def parse_dataframe(
    df: pd.DataFrame | pd.Series,
    key_mapping: dict | None = None,
    value_parsers: dict | None = None,
    extra_fields: dict | None = None,
    excluded_cols: list[str] | None = None,
    path: str | None = None
    ):
    """
    Convierte un DataFrame en una lista de dicts JSON-like y permite
    agregar campos extra a cada elemento.
    """

    if isinstance(df, pd.Series):
        df = df.to_frame().T

    key_mapping = key_mapping or {}
    value_parsers = value_parsers or {}
    extra_fields = extra_fields or {}
    excluded_cols = set(excluded_cols or [])

    parsed_rows = []

    for idx, row in df.iterrows():
        parsed_row = {}

        for column in df.columns:
            if column in excluded_cols:
                continue
            json_key = key_mapping.get(column, column)
            parser = value_parsers.get(column, default_parser)
            parsed_row[json_key] = parser(row[column])

        for key, value in extra_fields.items():
            if isinstance(value, list):
                parsed_row[key] = value[idx]
            else:
                parsed_row[key] = value

        parsed_rows.append(parsed_row)

    path and write_json(parsed_rows, path)

    return parsed_rows

