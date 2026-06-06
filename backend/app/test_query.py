from typing import Dict, Any, Tuple, List

class Column:
    def __init__(self, name):
        self.column_name = name
        self.friendly_name = name

class Metric:
    def __init__(self, name, expr):
        self.name = name
        self.friendly_name = name
        self.expression = expr

class Dataset:
    def __init__(self):
        self.columns = [Column('region'), Column('category')]
        self.metrics = [Metric('total_sales', 'SUM(sales)')]
        self.table_name = 'sales_data'
        self.custom_sql = None

def build_sql_query(dataset, query_config: Dict[str, Any], filters: Dict[str, Any] = None) -> Tuple[str, List[str]]:
    dimensions = query_config.get("dimensions", [])
    metrics = query_config.get("metrics", [])
    limit = query_config.get("limit", 100000)

    select_cols = []
    group_by = []
    
    # Map dimensions
    for dim_name in dimensions:
        col = next((c for c in dataset.columns if c.column_name == dim_name or c.friendly_name == dim_name), None)
        if col:
            select_cols.append(col.column_name)
            group_by.append(col.column_name)

    # Map metrics
    for metric in metrics:
        if isinstance(metric, str):
            met = next((m for m in dataset.metrics if m.name == metric or m.friendly_name == metric), None)
            if met:
                select_cols.append(f"{met.expression} AS {met.name}")
        elif isinstance(metric, dict):
            col_name = metric.get("column")
            agg = metric.get("agg", "sum").upper()
            alias = metric.get("name", f"{agg.lower()}_{col_name}")
            select_cols.append(f"{agg}({col_name}) AS {alias}")

    if not select_cols:
        return "", []

    from_clause = f"({dataset.custom_sql})" if dataset.custom_sql else dataset.table_name
    
    sql_str = f"SELECT {', '.join(select_cols)} FROM {from_clause}"
    
    if group_by:
        sql_str += f" GROUP BY {', '.join(group_by)}"
    
    sql_str += f" LIMIT {limit}"
    
    return sql_str, select_cols

ds = Dataset()
print(build_sql_query(ds, {"dimensions": ["region", "category"], "metrics": ["total_sales"]}))
