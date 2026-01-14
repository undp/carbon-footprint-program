from load_methodologies.utils.parsers import parse_json_cell

def build_detail_factors_dimentions(
        state, 
        detail_factors_input, 
        sub_category_name
        ):
    """
    Builds a list of detail factor dictionaries from a detail_factors object.

    :param detail_factors: Dictionary containing detail factor definitions.
    :param state: Object containing key names configuration.
    :param row: DataFrame row used to build the code key.
    :return: List of detail factor dictionaries.
    """
    detail_factors = parse_json_cell(detail_factors_input)
    factors_list = []

    for key, factor in detail_factors.items():

        factor_dict = {
            state.json_factor_dimenssions_code_key: f"{sub_category_name}_{key}",
            state.json_factor_dimenssions_name_key: key,
            state.json_factor_dimenssions_position_key: factor.get(state.json_factor_dimenssions_position_key),
            state.json_factor_dimenssions_isrequiered_key: factor.get(state.json_factor_dimenssions_isrequiered_value),
            state.json_factor_dimenssions_values_key: [
                {state.json_factor_dimenssions_name_key: value, state.json_factor_dimenssions_parent_key: None}
                for value in factor.get(state.json_factor_dimenssions_values_value, [])
            ]
        }

        factors_list.append(factor_dict)
    return factors_list