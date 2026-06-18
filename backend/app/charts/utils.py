from typing import List, Dict, Any, Tuple, Set
import pandas as pd
from sqlalchemy import text, create_engine
import re

def build_sql_query(dataset_or_datasets, query_config: Dict[str, Any], filters: Dict[str, Any] = None, engine_type: str = "postgres", joins: List[Any] = None, rls_clauses: Dict[int, List[str]] = None) -> Tuple[str, List[str], List[Dict[str, Any]], bool, List[Dict], List[Dict]]:
    is_multi = isinstance(dataset_or_datasets, dict)
    datasets = dataset_or_datasets if is_multi else {dataset_or_datasets.id: dataset_or_datasets}
    
    dimensions = query_config.get("dimensions", [])
    pivot_columns = query_config.get("pivotColumns", [])
    all_dims_to_fetch = dimensions + pivot_columns
    metrics = query_config.get("metrics", [])
    limit = query_config.get("limit", 100000)

    select_cols = []
    group_by = []
    required_dataset_ids = set()
    
    # Helper to escape SQL string values
    def escape_sql_string(value: str) -> str:
        """Escape single quotes in SQL string values by doubling them."""
        if not isinstance(value, str):
            return str(value)
        # Replace single quote with two single quotes (SQL standard escaping)
        return value.replace("'", "''")
    
    # Helper to check if a string can be parsed as numeric
    def is_numeric_string(s: str) -> bool:
        try:
            float(s)
            return True
        except ValueError:
            return False
    
    # SQL beautification function - defined early so it can be used by both single and multi-dataset paths
    def beautify_sql(sql: str) -> str:
        import re
        
        # ── Quote-aware whitespace normalizer ──
        # Splits SQL into segments inside vs outside single-quoted strings.
        # Only normalizes whitespace in segments OUTSIDE quotes, preserving
        # original spacing in data values like 'Kanpur II  LPG SA'.
        def normalize_outside_quotes(s: str) -> str:
            parts = []
            in_quote = False
            current = []
            i = 0
            while i < len(s):
                ch = s[i]
                if ch == "'" and not in_quote:
                    # Flush non-quoted segment with whitespace normalization
                    segment = ''.join(current)
                    parts.append(' '.join(segment.split()))
                    current = ["'"]
                    in_quote = True
                elif ch == "'" and in_quote:
                    # Check for escaped quote ('')
                    if i + 1 < len(s) and s[i + 1] == "'":
                        current.append("''")
                        i += 2
                        continue
                    current.append("'")
                    # Flush quoted segment as-is (preserve original whitespace)
                    parts.append(''.join(current))
                    current = []
                    in_quote = False
                else:
                    current.append(ch)
                i += 1
            # Flush remaining
            segment = ''.join(current)
            if in_quote:
                parts.append(segment)  # inside unclosed quote — preserve as-is
            else:
                parts.append(' '.join(segment.split()))
            return ''.join(parts)
        
        # ── Quote-aware regex substitution ──
        # Applies a regex replacement only to text outside single-quoted strings.
        def re_sub_outside_quotes(pattern, replacement, s, flags=0):
            parts = []
            in_quote = False
            current = []
            i = 0
            while i < len(s):
                ch = s[i]
                if ch == "'" and not in_quote:
                    # Flush and apply regex to non-quoted segment
                    segment = ''.join(current)
                    parts.append(re.sub(pattern, replacement, segment, flags=flags))
                    current = ["'"]
                    in_quote = True
                elif ch == "'" and in_quote:
                    if i + 1 < len(s) and s[i + 1] == "'":
                        current.append("''")
                        i += 2
                        continue
                    current.append("'")
                    parts.append(''.join(current))
                    current = []
                    in_quote = False
                else:
                    current.append(ch)
                i += 1
            segment = ''.join(current)
            if in_quote:
                parts.append(segment)
            else:
                parts.append(re.sub(pattern, replacement, segment, flags=flags))
            return ''.join(parts)
        
        # Normalize whitespace only outside quoted strings
        sql = normalize_outside_quotes(sql)
        
        # Format FROM clause
        sql = re_sub_outside_quotes(r'\b(FROM)\b', r'\n\1', sql, flags=re.IGNORECASE)
        
        # Format JOIN clauses with proper indentation
        sql = re_sub_outside_quotes(r'\b(LEFT\s+OUTER\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(RIGHT\s+OUTER\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(FULL\s+OUTER\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(LEFT\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(RIGHT\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(INNER\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(FULL\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(CROSS\s+JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(JOIN)\b', r'\n\1', sql, flags=re.IGNORECASE)
        
        # Add newlines for WHERE, GROUP BY, HAVING, ORDER BY, LIMIT
        sql = re_sub_outside_quotes(r'\b(WHERE)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(GROUP\s+BY)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(HAVING)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(ORDER\s+BY)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(LIMIT)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(FETCH\s+FIRST)\b', r'\n\1', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(ROWNUM)\b', r'\n\1', sql, flags=re.IGNORECASE)
        
        # Format ON clauses with indentation
        sql = re_sub_outside_quotes(r'\b(ON)\b', r'\n  ON', sql, flags=re.IGNORECASE)
        
        # Format AND/OR in WHERE clauses with proper indentation
        sql = re_sub_outside_quotes(r'\b(AND)\b', r'\n  AND', sql, flags=re.IGNORECASE)
        sql = re_sub_outside_quotes(r'\b(OR)\b', r'\n  OR', sql, flags=re.IGNORECASE)
        
        # Add indentation for SELECT columns (comma-separated)
        def format_select_columns(match):
            cols = match.group(1)
            col_list = [c.strip() for c in cols.split(',')]
            formatted_cols = ',\n    '.join(col_list)
            return f"SELECT\n    {formatted_cols}\n" + match.group(2)
        
        # Find SELECT ... FROM and format columns
        select_pattern = r'SELECT\s+(.*?)\s+(FROM\s+.*)'
        sql = re.sub(select_pattern, format_select_columns, sql, flags=re.IGNORECASE | re.DOTALL)
        
        # Clean up multiple newlines
        sql = re.sub(r'\n\s*\n', r'\n', sql)
        
        # Clean up extra spaces ONLY outside quotes (preserve multi-space data values)
        sql = normalize_outside_quotes(sql)
        
        # Remove trailing spaces from each line
        lines = [line.rstrip() for line in sql.split('\n')]
        sql = '\n'.join(lines)
        
        # Remove leading/trailing whitespace
        sql = sql.strip()
        
        return sql
    
    # Helper to parse column ref
    def parse_ref(ref):
        if is_multi and isinstance(ref, str) and '.' in ref:
            ds_id, name = ref.split('.', 1)
            return int(ds_id), name
        ds_id = list(datasets.keys())[0] if datasets else None
        return ds_id, ref if isinstance(ref, str) else ref.get("name") if isinstance(ref, dict) else str(ref)

    def parse_filter_node(node: dict, is_multi: bool) -> str:
        if not isinstance(node, dict):
            return ""
        
        if node.get("type") == "group":
            op = node.get("operator", "AND")
            children = node.get("children", [])
            child_exprs = [parse_filter_node(c, is_multi) for c in children]
            child_exprs = [c for c in child_exprs if c]
            if not child_exprs:
                return ""
            if len(child_exprs) == 1:
                return child_exprs[0]
            return f"({f' {op} '.join(child_exprs)})"
            
        elif node.get("type") == "rule":
            dataset_id = node.get("datasetId")
            if dataset_id:
                required_dataset_ids.add(int(dataset_id))
            col_name = node.get("column_name")
            value = node.get("value")
            rule_op = node.get("operator", "IN")
            is_calculated = node.get("isCalculated", False)
            
            # For calculated columns, col_name is the expression itself
            # For physical columns, we need to prefix with dataset alias if multi-dataset
            if is_calculated and is_multi and dataset_id:
                # For calculated columns in multi-dataset, we need to prefix column references in the expression
                # This is a simplified approach - in production, you'd want to parse the expression properly
                dataset = datasets.get(dataset_id)
                if dataset:
                    # Replace physical column names in the expression with dataset-prefixed versions
                    for physical_col in dataset.columns:
                        pattern = r'(?<!\.)\b' + re.escape(physical_col.column_name) + r'\b'
                        col_name = re.sub(pattern, f"ds_{dataset_id}.{physical_col.column_name}", col_name)
            
            col_expr = f"ds_{dataset_id}.{col_name}" if is_multi and dataset_id and not is_calculated else col_name
            
            if value is None or value == "" or value == []:
                return ""
            
            # ── Helper to build SQL for a single value, handling __NULL__ / __EMPTY__ sentinels ──
            def single_value_expr(v, op_type, col):
                """Return SQL expression for a single value with sentinel support.
                op_type: 'eq' for = / IN, 'neq' for != / NOT IN"""
                str_v = str(v)
                if str_v == '__NULL__':
                    return f"{col} IS NULL" if op_type == 'eq' else f"{col} IS NOT NULL"
                if str_v == '__EMPTY__':
                    cast_col = f"CAST({col} AS VARCHAR)"
                    if op_type == 'eq':
                        return f"({cast_col} = '' OR {cast_col} = '{{}}' OR {cast_col} = '[]')"
                    else:
                        return f"({cast_col} != '' AND {cast_col} != '{{}}' AND {cast_col} != '[]')"
                return None  # not a sentinel
            
            def build_list_filter(values, col, is_exclude=False):
                """Build filter expression for a list of values, separating sentinels from regular values."""
                op_type = 'neq' if is_exclude else 'eq'
                sentinel_parts = []
                regular_values = []
                
                for v in values:
                    sent_expr = single_value_expr(v, op_type, col)
                    if sent_expr:
                        sentinel_parts.append(sent_expr)
                    else:
                        regular_values.append(v)
                
                parts = []
                if regular_values:
                    vals_str = ", ".join([f"'{escape_sql_string(str(v))}'" for v in regular_values])
                    if is_exclude:
                        if len(regular_values) == 1:
                            parts.append(f"{col} != {vals_str}")
                        else:
                            parts.append(f"{col} NOT IN ({vals_str})")
                    else:
                        if len(regular_values) == 1:
                            parts.append(f"{col} = {vals_str}")
                        else:
                            parts.append(f"{col} IN ({vals_str})")
                
                parts.extend(sentinel_parts)
                
                if not parts:
                    return ""
                if len(parts) == 1:
                    return parts[0]
                # For include: combine with OR (value IN (...) OR col IS NULL)
                # For exclude: combine with AND (value NOT IN (...) AND col IS NOT NULL)
                joiner = " AND " if is_exclude else " OR "
                return f"({joiner.join(parts)})"
            
            # Handle single-value sentinels
            if not isinstance(value, list):
                sent = single_value_expr(value, 'neq' if rule_op == 'NOT_EQUALS' else 'eq', col_expr)
                if sent:
                    return sent
                
            if rule_op == "IN" and isinstance(value, list):
                return build_list_filter(value, col_expr, is_exclude=False)
            elif rule_op == "NOT_IN" and isinstance(value, list):
                return build_list_filter(value, col_expr, is_exclude=True)
            elif rule_op == "EQUALS":
                return f"{col_expr} = '{escape_sql_string(str(value))}'"
            elif rule_op == "NOT_EQUALS":
                return f"{col_expr} != '{escape_sql_string(str(value))}'"
            else:
                if isinstance(value, list):
                    return build_list_filter(value, col_expr, is_exclude=False)
                else:
                    return f"{col_expr} = '{escape_sql_string(str(value))}'"
                    
        return ""

    # Dimensions
    for dim in all_dims_to_fetch:
        dim_name = dim["name"] if isinstance(dim, dict) else dim
        dim_alias = dim.get("alias") if isinstance(dim, dict) else None
        ds_id, actual_name = parse_ref(dim_name)
        required_dataset_ids.add(ds_id)
        
        dataset = datasets.get(ds_id)
        if dataset:
            # First check physical columns
            col = next((c for c in dataset.columns if c.column_name == actual_name or c.friendly_name == actual_name), None)
            if col:
                col_expr = f"ds_{ds_id}.{col.column_name}" if is_multi else col.column_name
                alias = dim_alias if dim_alias and dim_alias != dim_name else actual_name
                select_cols.append(f'{col_expr} AS "{alias}"')
                group_by.append(col_expr)
            else:
                # Check calculated columns
                calc_col = next((c for c in dataset.calculated_columns if c.name == actual_name or c.friendly_name == actual_name), None)
                if calc_col:
                    # Use the expression directly, replacing column references with table-prefixed versions if multi-dataset
                    expr = calc_col.expression
                    if is_multi:
                        # Replace column names in expression with dataset-prefixed versions
                        for physical_col in dataset.columns:
                            pattern = r'(?<!\.)\b' + re.escape(physical_col.column_name) + r'\b'
                            expr = re.sub(pattern, f"ds_{ds_id}.{physical_col.column_name}", expr)
                    col_expr = expr
                    alias = dim_alias if dim_alias and dim_alias != dim_name else actual_name
                    select_cols.append(f'{col_expr} AS "{alias}"')
                    # For calculated columns, we can't add to GROUP BY directly if it's an expression
                    # Instead, we add the expression itself
                    group_by.append(f"({col_expr})")

    # Metrics
    for metric in metrics:
        if isinstance(metric, str):
            ds_id, actual_name = parse_ref(metric)
            required_dataset_ids.add(ds_id)
            dataset = datasets.get(ds_id)
            if dataset:
                met = next((m for m in dataset.metrics if m.name == actual_name or m.friendly_name == actual_name), None)
                if met:
                    expr = met.expression
                    if is_multi:
                        for physical_col in dataset.columns:
                            pattern = r'(?<!\.)\b' + re.escape(physical_col.column_name) + r'\b'
                            expr = re.sub(pattern, f"ds_{ds_id}.{physical_col.column_name}", expr)
                    select_cols.append(f'{expr} AS "{met.name}"')
        elif isinstance(metric, dict):
            m_name = metric.get("name") or metric.get("column")
            ds_id, actual_name = parse_ref(m_name)
            required_dataset_ids.add(ds_id)
            dataset = datasets.get(ds_id)
            if dataset:
                col_name = metric.get("column")
                if col_name:
                    _, actual_col_name = parse_ref(col_name)
                    col_expr = f"ds_{ds_id}.{actual_col_name}" if is_multi else actual_col_name
                    agg_type = metric.get("agg", "sum").upper()
                    if agg_type == "DISTINCT_COUNT":
                        agg_expr = f"COUNT(DISTINCT {col_expr})"
                    else:
                        agg_expr = f"{agg_type}({col_expr})"
                    alias = metric.get("alias") or metric.get("name", f"{agg_type.lower()}_{actual_col_name}")
                    select_cols.append(f'{agg_expr} AS "{alias}"')
                else:
                    met = next((m for m in dataset.metrics if m.name == actual_name or m.friendly_name == actual_name), None)
                    if met:
                        expr = met.expression
                        if is_multi:
                            for physical_col in dataset.columns:
                                pattern = r'(?<!\.)\b' + re.escape(physical_col.column_name) + r'\b'
                                expr = re.sub(pattern, f"ds_{ds_id}.{physical_col.column_name}", expr)
                        alias = metric.get("alias") or met.name
                        select_cols.append(f'{expr} AS "{alias}"')

    if not select_cols:
        return "", [], [], False

    # Pre-parse WHERE clause to collect required_dataset_ids before building FROM/JOIN
    where_clause = ""
    if filters:
        if filters.get("type") == "group":
            ast_cond = parse_filter_node(filters, is_multi)
            if ast_cond:
                where_clause = f" WHERE {ast_cond}"
        else:
            conditions = []
            for filter_ref, value in filters.items():
                ds_id, col_name = parse_ref(filter_ref)
                if ds_id:
                    required_dataset_ids.add(int(ds_id))
                col_expr = f"ds_{ds_id}.{col_name}" if is_multi and ds_id else col_name
                if value is not None and value != "" and value != []:
                    val_list = value if isinstance(value, list) else [value]
                    
                    excludes = []
                    includes = []
                    for v in val_list:
                        if isinstance(v, str) and v.startswith("__EXCLUDE__"):
                            excludes.append(v[11:])
                        else:
                            includes.append(v)
                    
                    # Helper to separate sentinels (__NULL__, __EMPTY__) from regular values
                    def partition_sentinels(values, col, is_exclude=False):
                        """Returns list of SQL condition strings, handling __NULL__ and __EMPTY__ sentinels."""
                        sentinel_conds = []
                        regular_vals = []
                        for v in values:
                            str_v = str(v)
                            if str_v == '__NULL__':
                                sentinel_conds.append(f"{col} IS NOT NULL" if is_exclude else f"{col} IS NULL")
                            elif str_v == '__EMPTY__':
                                cast_col = f"CAST({col} AS VARCHAR)"
                                if is_exclude:
                                    sentinel_conds.append(f"({cast_col} != '' AND {cast_col} != '{{}}' AND {cast_col} != '[]')")
                                else:
                                    sentinel_conds.append(f"({cast_col} = '' OR {cast_col} = '{{}}' OR {cast_col} = '[]')")
                            else:
                                regular_vals.append(v)
                        return regular_vals, sentinel_conds
                            
                    item_conds = []
                    if includes:
                        regular_inc, sentinel_inc_conds = partition_sentinels(includes, col_expr, is_exclude=False)
                        
                        inc_parts = []
                        if regular_inc:
                            col_expr_inc = col_expr
                            has_non_numeric_str_inc = any(isinstance(v, str) and not is_numeric_string(v) for v in regular_inc)
                            if has_non_numeric_str_inc:
                                col_expr_inc = f"CAST({col_expr_inc} AS VARCHAR)"
                            
                            if len(regular_inc) == 1:
                                v = regular_inc[0]
                                val_str = f"'{escape_sql_string(str(v))}'"
                                inc_parts.append(f"{col_expr_inc} = {val_str}")
                            else:
                                vals = ", ".join([f"'{escape_sql_string(str(v))}'" for v in regular_inc])
                                inc_parts.append(f"{col_expr_inc} IN ({vals})")
                        
                        inc_parts.extend(sentinel_inc_conds)
                        
                        if inc_parts:
                            if len(inc_parts) == 1:
                                item_conds.append(inc_parts[0])
                            else:
                                # Include: combine with OR (IN (...) OR IS NULL)
                                item_conds.append(f"({' OR '.join(inc_parts)})")
                            
                    if excludes:
                        regular_exc, sentinel_exc_conds = partition_sentinels(excludes, col_expr, is_exclude=True)
                        
                        exc_parts = []
                        if regular_exc:
                            col_expr_exc = col_expr
                            has_non_numeric_str_exc = any(isinstance(v, str) and not is_numeric_string(v) for v in regular_exc)
                            if has_non_numeric_str_exc:
                                col_expr_exc = f"CAST({col_expr_exc} AS VARCHAR)"
                            
                            if len(regular_exc) == 1:
                                v = regular_exc[0]
                                val_str = f"'{escape_sql_string(str(v))}'"
                                exc_parts.append(f"{col_expr_exc} != {val_str}")
                            else:
                                vals = ", ".join([f"'{escape_sql_string(str(v))}'" for v in regular_exc])
                                exc_parts.append(f"{col_expr_exc} NOT IN ({vals})")
                        
                        exc_parts.extend(sentinel_exc_conds)
                        
                        if exc_parts:
                            if len(exc_parts) == 1:
                                item_conds.append(exc_parts[0])
                            else:
                                # Exclude: combine with AND (NOT IN (...) AND IS NOT NULL)
                                item_conds.append(f"({' AND '.join(exc_parts)})")
                            
                    if item_conds:
                        if len(item_conds) == 1:
                            conditions.append(item_conds[0])
                        else:
                            conditions.append(f"({' AND '.join(item_conds)})")
            if conditions:
                where_clause = f" WHERE {' AND '.join(conditions)}"

    is_oracle = "oracle" in (engine_type or "").lower()

    applied_joins_info = []
    has_missing_joins = False

    def get_dataset_ref(ds_id: int, ds, alias: str = None) -> str:
        # Build table reference without unnecessary subqueries
        if ds.custom_sql:
            clean_sql = ds.custom_sql.strip().rstrip(';')
            tbl = f"({clean_sql})"
        else:
            tbl = get_quoted_table_ref(ds.schema_name, ds.table_name, engine_type)

        ds_rls = (rls_clauses or {}).get(ds_id, [])
        if ds_rls:
            rls_where = " AND ".join([f"({c})" for c in ds_rls])
            # Only wrap in subquery if there are RLS clauses
            tbl = f"(SELECT * FROM {tbl} WHERE {rls_where})"
        
        if alias:
            return f"{tbl} {alias}" if is_oracle else f"{tbl} AS {alias}"
        else:
            # Only add alias if we wrapped in subquery (custom_sql or RLS)
            if ds.custom_sql or ds_rls:
                return f"{tbl} src_dataset" if is_oracle else f"{tbl} AS src_dataset"
            return tbl

    # Build FROM and JOIN
    if not is_multi:
        ds_id = list(datasets.keys())[0]
        dataset = datasets[ds_id]
        from_clause = get_dataset_ref(ds_id, dataset)
        
        # Build complete SELECT statement for single dataset
        if select_cols:
            cols_str = ',\n    '.join(select_cols)
            sql = f"SELECT\n    {cols_str}\nFROM {from_clause}"
            if where_clause:
                sql += where_clause
            if group_by:
                sql += f" GROUP BY {', '.join(group_by)}"
            
            # ORDER BY (Superset-style: explicit or auto-sort by first metric DESC)
            order_by = query_config.get("orderBy", [])
            if order_by:
                order_parts = []
                for ob in order_by:
                    col = ob.get("column", "")
                    direction = ob.get("direction", "DESC").upper()
                    if direction not in ("ASC", "DESC"):
                        direction = "DESC"
                    if col:
                        order_parts.append(f'"{ col }" {direction}')
                if order_parts:
                    sql += f" ORDER BY {', '.join(order_parts)}"
            elif group_by and select_cols:
                # Default: order by first aggregate metric DESC
                for sc in select_cols:
                    if any(agg in sc.upper() for agg in ['SUM(', 'AVG(', 'COUNT(', 'MIN(', 'MAX(']):
                        alias = sc.split(' AS ')[-1].strip().strip('"')
                        sql += f' ORDER BY "{alias}" DESC'
                        break
            
            if is_oracle:
                sql += f" FETCH FIRST {limit} ROWS ONLY"
            else:
                sql += f" LIMIT {limit}"
            
            # Beautify the SQL
            sql = beautify_sql(sql)
            
            return sql, [], [], False, [], []
        else:
            return "", [], [], False, [], []
        
    # Multi-table JOIN logic - find all possible join paths
    if not required_dataset_ids:
        return "", [], [], False, [], []
        
    base_ds_id = list(required_dataset_ids)[0]
    base_ds = datasets[base_ds_id]
    
    custom_joins_data = query_config.get("custom_joins", [])
    class DummyJoin: pass
    custom_joins = []
    for cj in custom_joins_data:
        dj = DummyJoin()
        dj.left_dataset_id = int(cj["left_dataset_id"])
        dj.right_dataset_id = int(cj["right_dataset_id"])
        dj.join_type = cj.get("join_type", "LEFT")
        dj.join_condition = cj["join_condition"]
        custom_joins.append(dj)
        
    all_joins = (joins or []) + custom_joins
    
    # Resolve calculated columns in all join conditions
    def resolve_calculated_columns_in_join_condition(condition: str, datasets: dict) -> str:
        if not condition:
            return condition
        resolved = condition
        pattern = r'ds_(\d+)\.([a-zA-Z0-9_]+)'
        
        def replace_match(match):
            ds_id_str = match.group(1)
            col_name = match.group(2)
            ds_id = int(ds_id_str)
            
            dataset = datasets.get(ds_id)
            if dataset:
                # Check calculated columns
                calc_col = next((c for c in dataset.calculated_columns if c.name == col_name), None)
                if calc_col:
                    expr = calc_col.expression
                    # Replace physical column names in expression with dataset-prefixed versions
                    for physical_col in dataset.columns:
                        phys_pattern = r'(?<!\.)\b' + re.escape(physical_col.column_name) + r'\b'
                        expr = re.sub(phys_pattern, f"ds_{ds_id}.{physical_col.column_name}", expr)
                    return f"({expr})"
            return match.group(0)
            
        resolved = re.sub(pattern, replace_match, resolved)
        return resolved

    resolved_joins = []
    for j in all_joins:
        class ResolvedJoin:
            def __init__(self, original_join, resolved_condition):
                self.id = getattr(original_join, 'id', None)
                self.left_dataset_id = original_join.left_dataset_id
                self.right_dataset_id = original_join.right_dataset_id
                self.join_type = original_join.join_type
                self.join_condition = resolved_condition
        resolved_cond = resolve_calculated_columns_in_join_condition(j.join_condition, datasets)
        resolved_joins.append(ResolvedJoin(j, resolved_cond))
    all_joins = resolved_joins
    
    # Build adjacency list for join graph
    join_graph: Dict[int, List[object]] = {ds_id: [] for ds_id in required_dataset_ids}
    
    for j in all_joins:
        if j.left_dataset_id in required_dataset_ids and j.right_dataset_id in required_dataset_ids:
            join_graph[j.left_dataset_id].append(j)
            join_graph[j.right_dataset_id].append(j)
    
    # Find all possible spanning trees (join paths) using DFS
    def find_all_spanning_trees(start_id: int, target_ids: Set[int]) -> List[List[object]]:
        """Find all possible ways to connect all target datasets."""
        all_trees: List[List[object]] = []
        
        def dfs(current_id: int, visited: Set[int], edges: List[object]):
            if visited == target_ids:
                all_trees.append(edges.copy())
                return
            
            for j in join_graph.get(current_id, []):
                other_id = j.right_dataset_id if j.left_dataset_id == current_id else j.left_dataset_id
                
                if other_id not in visited:
                    edge_id = tuple(sorted([j.left_dataset_id, j.right_dataset_id]))
                    edge_used = any(tuple(sorted([e.left_dataset_id, e.right_dataset_id])) == edge_id for e in edges)
                    
                    if not edge_used:
                        edges.append(j)
                        dfs(other_id, visited | {other_id}, edges)
                        edges.pop()
        
        dfs(start_id, {start_id}, [])
        return all_trees
    
    # Find all possible join combinations
    all_spanning_trees = find_all_spanning_trees(base_ds_id, required_dataset_ids)
    
    # Detect if there are multiple valid paths
    has_multiple_paths = len(all_spanning_trees) > 1
    join_warnings: List[Dict] = []
    sql_options: List[Dict] = []
    
    if has_multiple_paths:
        # Find which datasets have multiple connection options
        multiple_path_datasets = []
        for ds_id in required_dataset_ids:
            if ds_id == base_ds_id:
                continue
            reach_count = sum(1 for tree in all_spanning_trees 
                           if any((j.left_dataset_id == ds_id or j.right_dataset_id == ds_id) 
                                 for j in tree))
            if reach_count > 1:
                ds = datasets[ds_id]
                connected_to = set()
                for j in all_joins:
                    if j.left_dataset_id == ds_id and j.right_dataset_id in required_dataset_ids:
                        connected_to.add(datasets[j.right_dataset_id].name)
                    elif j.right_dataset_id == ds_id and j.left_dataset_id in required_dataset_ids:
                        connected_to.add(datasets[j.left_dataset_id].name)
                
                multiple_path_datasets.append({
                    "dataset": ds.name,
                    "connection_count": reach_count,
                    "connected_to": list(connected_to)
                })
        
        if multiple_path_datasets:
            join_warnings.append({
                "type": "multiple_paths",
                "message": f"Multiple join paths detected! {len(all_spanning_trees)} valid combinations found.",
                "details": multiple_path_datasets,
                "recommendation": "Review the SQL options below and select the one that matches your business logic.",
                "option_count": len(all_spanning_trees)
            })
    
    # Build SQL using the first spanning tree (or user-selected one)
    selected_tree_idx = query_config.get("selected_join_tree", 0)
    if selected_tree_idx >= len(all_spanning_trees):
        selected_tree_idx = 0
    
    if all_spanning_trees:
        selected_tree = all_spanning_trees[selected_tree_idx]
        
        # Build FROM clause with selected joins
        joined_ids = {base_ds_id}
        from_clause = get_dataset_ref(base_ds_id, base_ds, f"ds_{base_ds_id}")
        
        # Add joins in order
        remaining_joins = selected_tree.copy()
        max_iterations = len(remaining_joins) * 2
        iteration = 0
        
        while remaining_joins and iteration < max_iterations:
            iteration += 1
            made_join = False
            
            for i, j in enumerate(remaining_joins):
                if j.left_dataset_id in joined_ids:
                    right_ds = datasets[j.right_dataset_id]
                    tbl_ref = get_dataset_ref(j.right_dataset_id, right_ds, f"ds_{j.right_dataset_id}")
                    from_clause += f" {j.join_type} JOIN {tbl_ref} ON {j.join_condition}"
                    applied_joins_info.append({
                        "type": j.join_type,
                        "condition": j.join_condition,
                        "target_dataset": right_ds.name,
                        "tree_index": selected_tree_idx
                    })
                    joined_ids.add(j.right_dataset_id)
                    remaining_joins.pop(i)
                    made_join = True
                    break
                elif j.right_dataset_id in joined_ids:
                    left_ds = datasets[j.left_dataset_id]
                    tbl_ref = get_dataset_ref(j.left_dataset_id, left_ds, f"ds_{j.left_dataset_id}")
                    from_clause += f" {j.join_type} JOIN {tbl_ref} ON {j.join_condition}"
                    applied_joins_info.append({
                        "type": j.join_type,
                        "condition": j.join_condition,
                        "target_dataset": left_ds.name,
                        "tree_index": selected_tree_idx
                    })
                    joined_ids.add(j.left_dataset_id)
                    remaining_joins.pop(i)
                    made_join = True
                    break
            
            if not made_join:
                break
        
        has_missing_joins = len(remaining_joins) > 0
        
        # Generate all SQL options for UI
        for idx, tree in enumerate(all_spanning_trees):
            temp_joined_ids = {base_ds_id}
            temp_from = get_dataset_ref(base_ds_id, base_ds, f"ds_{base_ds_id}")
            temp_applied_joins = []
            
            temp_remaining = tree.copy()
            temp_max_iter = len(temp_remaining) * 2
            temp_iter = 0
            
            while temp_remaining and temp_iter < temp_max_iter:
                temp_iter += 1
                temp_made = False
                
                for i, j in enumerate(temp_remaining):
                    if j.left_dataset_id in temp_joined_ids:
                        right_ds = datasets[j.right_dataset_id]
                        tbl_ref = get_dataset_ref(j.right_dataset_id, right_ds, f"ds_{j.right_dataset_id}")
                        temp_from += f" {j.join_type} JOIN {tbl_ref} ON {j.join_condition}"
                        temp_applied_joins.append({
                            "type": j.join_type,
                            "condition": j.join_condition,
                            "target_dataset": right_ds.name
                        })
                        temp_joined_ids.add(j.right_dataset_id)
                        temp_remaining.pop(i)
                        temp_made = True
                        break
                    elif j.right_dataset_id in temp_joined_ids:
                        left_ds = datasets[j.left_dataset_id]
                        tbl_ref = get_dataset_ref(j.left_dataset_id, left_ds, f"ds_{j.left_dataset_id}")
                        temp_from += f" {j.join_type} JOIN {tbl_ref} ON {j.join_condition}"
                        temp_applied_joins.append({
                            "type": j.join_type,
                            "condition": j.join_condition,
                            "target_dataset": left_ds.name
                        })
                        temp_joined_ids.add(j.left_dataset_id)
                        temp_remaining.pop(i)
                        temp_made = True
                        break
                
                if not temp_made:
                    break
            
            temp_sql = f"SELECT {', '.join(select_cols)} FROM {temp_from}{where_clause}"
            if group_by:
                temp_sql += f" GROUP BY {', '.join(group_by)}"
            if is_oracle:
                temp_sql += f" FETCH FIRST {limit} ROWS ONLY"
            else:
                temp_sql += f" LIMIT {limit}"
            
            sql_options.append({
                "index": idx,
                "sql": temp_sql,
                "joins": temp_applied_joins,
                "description": f"Option {idx + 1}: {' -> '.join([j['target_dataset'] for j in temp_applied_joins])}"
            })
    else:
        has_missing_joins = True
        join_warnings.append({
            "type": "no_path",
            "message": "No valid join path found to connect all datasets.",
            "suggestions": []
        })
        from_clause = get_dataset_ref(base_ds_id, base_ds, f"ds_{base_ds_id}")

    sql_str = f"SELECT {', '.join(select_cols)} FROM {from_clause}{where_clause}"
    
    if group_by:
        sql_str += f" GROUP BY {', '.join(group_by)}"
    
    # ORDER BY (Superset-style: explicit or auto-sort by first metric DESC)
    order_by = query_config.get("orderBy", [])
    if order_by:
        order_parts = []
        for ob in order_by:
            col = ob.get("column", "")
            direction = ob.get("direction", "DESC").upper()
            if direction not in ("ASC", "DESC"):
                direction = "DESC"
            if col:
                order_parts.append(f'"{ col }" {direction}')
        if order_parts:
            sql_str += f" ORDER BY {', '.join(order_parts)}"
    elif group_by and select_cols:
        # Default: order by first aggregate metric DESC
        for sc in select_cols:
            if any(agg in sc.upper() for agg in ['SUM(', 'AVG(', 'COUNT(', 'MIN(', 'MAX(']):
                alias = sc.split(' AS ')[-1].strip().strip('"')
                sql_str += f' ORDER BY "{alias}" DESC'
                break
    
    if is_oracle:
        sql_str += f" FETCH FIRST {limit} ROWS ONLY"
    else:
        sql_str += f" LIMIT {limit}"
    
    # Add beautified SQL to all options
    for option in sql_options:
        option["beautified_sql"] = beautify_sql(option["sql"])
    
    beautified_sql = beautify_sql(sql_str)
    
    # Now add sql_options to warning AFTER beautification
    if has_multiple_paths and sql_options and len(join_warnings) > 0:
        join_warnings[0]["sql_options"] = sql_options
    
    return beautified_sql, select_cols, applied_joins_info, has_missing_joins, join_warnings, sql_options


def get_sync_uri(uri: str) -> str:
    if "+asyncpg" in uri:
        return uri.replace("+asyncpg", "")
    elif "+aiomysql" in uri:
        return uri.replace("+aiomysql", "+pymysql")
    elif "+asyncmy" in uri:
        return uri.replace("+asyncmy", "")
    elif "oracle" in uri and "+oracledb" not in uri:
        return uri.replace("oracle://", "oracle+oracledb://")
    return uri

def wrap_query(query: str, engine_type: str, limit: int = None, alias: str = "src_query") -> str:
    """Wraps a query in a subquery with an optional limit, dialect-aware."""
    is_oracle = "oracle" in (engine_type or "").lower()
    
    clean_query = query.strip().rstrip(';')
    
    if is_oracle:
        if limit == 0:
            wrapped = f"SELECT * FROM ({clean_query}) {alias} WHERE ROWNUM = 0"
        else:
            wrapped = f"SELECT * FROM ({clean_query}) {alias}"
            if limit is not None:
                wrapped += f" FETCH FIRST {limit} ROWS ONLY"
    else:
        wrapped = f"SELECT * FROM ({clean_query}) AS {alias}"
        if limit is not None:
            wrapped += f" LIMIT {limit}"
            
    return wrapped

def deduplicate_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Deduplicates dataframe column names by suffixing duplicate names with _1, _2, etc."""
    cols = []
    seen = {}
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            cols.append(col)
    df.columns = cols
    return df

def get_quoted_table_ref(schema: str, table: str, engine_type: str) -> str:
    """Returns a dialect-aware quoted table reference (e.g. `schema`.`table` or "schema"."table")."""
    engine_lower = (engine_type or "").lower()
    if "mysql" in engine_lower or "starrocks" in engine_lower:
        return f"`{schema}`.`{table}`" if schema else f"`{table}`"
    else:
        return f'"{schema}"."{table}"' if schema else f'"{table}"'

def get_quoted_identifier(ident: str, engine_type: str) -> str:
    """Returns a dialect-aware quoted identifier."""
    engine_lower = (engine_type or "").lower()
    if "mysql" in engine_lower or "starrocks" in engine_lower:
        return f"`{ident}`"
    return f'"{ident}"'
