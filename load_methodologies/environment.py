class State:
    """
    Centralized configuration container for methodology processing.

    Stores all configurable parameters related to:
    - Excel sheet identifiers and names
    - JSON parsing keys
    - Excel column names
    - Methodology metadata
    """

    methodologies_excel = r"C:\Users\juanf\Downloads\Estructura metodología.xlsx"
    json_path = r"C:\Users\juanf\Juanfra\Inventures\HuellaLatam\undp-huella-latam\methodologies.json"
    measurement_unit_path = r"C:\Users\juanf\Juanfra\Inventures\HuellaLatam\undp-huella-latam\measurement_units.json"
    rate_measurement_unit_path = r"C:\Users\juanf\Juanfra\Inventures\HuellaLatam\undp-huella-latam\rate_measurement_units.json"

    # ------------- Dataframes metadata
    methodology_sheet_key = "methodology_sheet"
    categories_sheet_key = "categories"
    subcategories_sheet_key = "subcategories"
    emission_factors_sheet_key = "emission_factors"
    measurement_units_key = "measurement_units"
    rate_measurement_units_key = "rate_measurement_units"
    sheet_names = {
        methodology_sheet_key: "Metodologías",
        categories_sheet_key: "Categorías",
        subcategories_sheet_key: "Subcategorías",
        emission_factors_sheet_key: "Factores de emisión",
        measurement_units_key: "Measurement unit",
        rate_measurement_units_key: "Rate measurement unit"
    }

    # -------------  Json key values
    categories_key = "categories"
    json_category_name_value = "name"
    json_subcategory_name_value = "name"
    excel_subcategory_detail_column = "detail"
    json_dimension_col_key = "dimensionCode"
    json_factor_dimention_key = "emissionFactorDimensions"
    json_factor_values_key = "emissionFactors"

    # Factor dimentions keys and values fields
    json_factor_dimenssions_code_key = "code"
    json_factor_dimenssions_name_key = "name"
    json_factor_dimenssions_position_key = "position"
    json_factor_dimenssions_isrequiered_key = "isRequired"
    json_factor_dimenssions_isrequiered_value = "es_requerida"
    json_factor_dimenssions_values_key = "values"
    json_factor_dimenssions_values_value = "valores"
    json_factor_dimenssions_name_key = "name"
    json_factor_dimenssions_parent_key = "parentValue"

    # Factor values keys and values fields
    excel_gas_name_column = "gas"
    co2eq_value = "CO2eq"
    factor_value_column = "valor"


    # -------------  Methodologies excel-json attributes parse
    methodology_columns_map = {
            "Código país": "countryIsoCode",
            "Nombre": "name",
            "Descripción": "description",
            "Estatus": "statusCode"
            }
    
    # -------------  Category configs. 
    # excel-json attributes parse
    catergory_name_excel_value = "Nombre categoría"
    category_map = {
        catergory_name_excel_value: json_category_name_value,
        "Sinónimo": "synonyms",
        "Descripción": "description",
        "Posición": "position"
    }

    # -------------  Sub-category configs. 
    # excel-json attributes parse
    subcatergory_name_excel_value = "Nombre Sub categoría"
    subcategory_detail_column = "Detalle"
    subcategory_map = {
        "Nombre Sub categoría": json_subcategory_name_value,
        "Descripción": "description",
        }
    subcategory_excluded_cols = [
        'Nombre categoría',
        "Detalle",
        "variable 1", 
        "variable 2", 
        "detail"
        ]

    # -------------  Measurement excel-json attributes parse
    measurement_units_map = {
            "base_factor": "baseFactor",
            "is_base": "isBase"
            }

    # Extra attributes
    category_extra_attributes = {
            "examples": None
    }