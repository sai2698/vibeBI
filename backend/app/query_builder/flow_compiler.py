from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import json

from app.models import Dataset
from app.charts.utils import get_quoted_identifier

async def get_dataset_sql(db: AsyncSession, dataset_id: int, engine_type: str = "postgres") -> str:
    """Helper to get base SQL for a dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise ValueError(f"Dataset with ID {dataset_id} not found.")
    
    if dataset.dataset_type == "flow":
        if not dataset.flow_config:
            raise ValueError(f"Dataflow dataset {dataset_id} is missing flow_config.")
        return await compile_flow_to_sql(db, dataset.flow_config, engine_type)
    elif dataset.custom_sql:
        return dataset.custom_sql
    else:
        # A simple table wrapper
        schema_prefix = f'{get_quoted_identifier(dataset.schema_name, engine_type)}.' if dataset.schema_name else ""
        return f'SELECT * FROM {schema_prefix}{get_quoted_identifier(dataset.table_name, engine_type)}'

def topological_sort(nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
    """Sort nodes topologically based on edges."""
    adj_list: Dict[str, List[str]] = {n['id']: [] for n in nodes}
    in_degree: Dict[str, int] = {n['id']: 0 for n in nodes}
    
    for edge in edges:
        source = edge['source']
        target = edge['target']
        if source in adj_list and target in in_degree:
            adj_list[source].append(target)
            in_degree[target] += 1
            
    # Queue for nodes with no incoming edges
    queue = [n_id for n_id, deg in in_degree.items() if deg == 0]
    sorted_ids = []
    
    while queue:
        curr = queue.pop(0)
        sorted_ids.append(curr)
        for neighbor in adj_list.get(curr, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                
    if len(sorted_ids) != len(nodes):
        raise ValueError("Cycle detected in dataflow graph, or disconnected nodes exist incorrectly.")
        
    # Map back to node objects
    node_map = {n['id']: n for n in nodes}
    return [node_map[n_id] for n_id in sorted_ids]

async def compile_flow_to_sql(db: AsyncSession, flow_config: Dict[str, Any], engine_type: str = "postgres") -> str:
    """
    Compiles a React Flow JSON graph into a direct JOIN SQL query (no CTEs).
    Uses node IDs as table aliases for clean, direct joins.
    Expected node types:
    - 'sourceNode': data.dataset_id
    - 'joinNode': data.join_type (e.g., 'INNER JOIN'), data.join_condition
    - 'outputNode': final result
    """
    nodes = flow_config.get('nodes', [])
    edges = flow_config.get('edges', [])
    
    if not nodes:
        return "SELECT 1 as empty_flow"
        
    sorted_nodes = topological_sort(nodes, edges)
    
    # Track incoming edges for each node: target_id -> [source_ids]
    incoming_edges: Dict[str, List[str]] = {}
    for edge in edges:
        target = edge['target']
        source = edge['source']
        if target not in incoming_edges:
            incoming_edges[target] = []
        incoming_edges[target].append(source)

    final_node_id = None
    node_table_refs: Dict[str, str] = {}  # Maps node_id (as alias) to actual table reference

    for i, node in enumerate(sorted_nodes):
        node_id = node['id']
        node_type = node.get('type')
        data = node.get('data', {})
        
        if node_type == 'sourceNode':
            dataset_id = data.get('dataset_id')
            if not dataset_id:
                raise ValueError(f"Source Node {node_id} is missing dataset_id")
            
            # Fetch dataset to get table info
            result = await db.execute(
                select(Dataset)
                .where(Dataset.id == dataset_id)
            )
            dataset = result.scalar_one_or_none()
            
            # Create a valid SQL alias by prefixing with 't'
            table_alias = f"t{node_id}"
            
            # Get the base table reference with schema
            if dataset and dataset.schema_name and dataset.table_name:
                from app.charts.utils import get_quoted_table_ref
                table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, engine_type)
                # Use prefixed node_id as alias
                node_table_refs[node_id] = f"{table_ref} {table_alias}"
            elif dataset and dataset.table_name:
                table_ref = get_quoted_identifier(dataset.table_name, engine_type)
                node_table_refs[node_id] = f"{table_ref} {table_alias}"
            else:
                node_table_refs[node_id] = f"source_{node_id} {table_alias}"
                
        elif node_type == 'joinNode':
            parents = incoming_edges.get(node_id, [])
            if len(parents) < 2:
                raise ValueError(f"Join Node {node_id} requires at least 2 inputs")
                
            parent_1 = parents[0]
            parent_2 = parents[1]
            
            # Create valid SQL aliases for parent nodes
            parent_1_alias = f"t{parent_1}"
            parent_2_alias = f"t{parent_2}"
            
            join_type = data.get('join_type', 'INNER JOIN')
            
            join_conditions = data.get('join_conditions')
            if join_conditions and isinstance(join_conditions, list):
                cond_strs = []
                for cond in join_conditions:
                    l_col = cond.get('left_col')
                    op = cond.get('op', '=')
                    r_col = cond.get('right_col')
                    if l_col and r_col:
                        l_quoted = get_quoted_identifier(l_col, engine_type)
                        r_quoted = get_quoted_identifier(r_col, engine_type)
                        # Use prefixed parent node IDs as table aliases
                        cond_strs.append(f"{parent_1_alias}.{l_quoted} {op} {parent_2_alias}.{r_quoted}")
                join_condition = " AND ".join(cond_strs) if cond_strs else "1=1"
            else:
                join_condition = data.get('join_condition', '1=1')
                
            if "mysql" in engine_type.lower():
                join_condition = join_condition.replace('"', '`')
            
            # Store join info for SQL generation
            node_table_refs[node_id] = {
                'parent_1': parent_1,
                'parent_2': parent_2,
                'parent_1_alias': parent_1_alias,
                'parent_2_alias': parent_2_alias,
                'join_type': join_type,
                'join_condition': join_condition
            }
            
        elif node_type == 'outputNode':
            parents = incoming_edges.get(node_id, [])
            if not parents:
                raise ValueError(f"Output Node {node_id} has no inputs")
                
            final_node_id = node_id
            
        else:
            # Pass-through or unknown node
            parents = incoming_edges.get(node_id, [])
            if parents:
                # Just pass through the parent's reference
                node_table_refs[node_id] = node_table_refs.get(parents[0], '')
                
    if not final_node_id:
        final_node_id = sorted_nodes[-1]['id']
    
    # Build direct JOIN SQL
    # Find all source nodes and join nodes in order
    source_nodes = [n for n in sorted_nodes if n.get('type') == 'sourceNode']
    join_nodes = [n for n in sorted_nodes if n.get('type') == 'joinNode']
    
    if not source_nodes:
        return "SELECT 1 as no_sources"
    
    # Track the "current" table alias for each logical node
    # For source nodes, it's their own alias
    # For join nodes, it's the alias of the second table added (the one being joined)
    node_to_alias: Dict[str, str] = {}
    
    # Start with the first source node
    first_source = source_nodes[0]
    first_source_id = first_source['id']
    first_source_alias = f"t{first_source_id}"
    sql_parts = [f"SELECT * FROM {node_table_refs[first_source_id]}"]
    node_to_alias[first_source_id] = first_source_alias
    
    # Add all join nodes in order
    for join_node in join_nodes:
        join_node_id = join_node['id']
        join_info = node_table_refs.get(join_node_id, {})
        
        if isinstance(join_info, dict) and 'parent_1_alias' in join_info:
            parent_1 = join_info['parent_1']
            parent_2 = join_info['parent_2']
            parent_1_alias = join_info['parent_1_alias']
            parent_2_alias = join_info['parent_2_alias']
            join_type = join_info['join_type']
            join_condition = join_info['join_condition']
            
            # Get table ref for parent_2 (the new table being joined)
            if parent_2 in node_table_refs:
                parent_2_ref = node_table_refs[parent_2]
                
                # Replace references to parent_1 and parent_2 in join condition
                # with their actual aliases (only if they exist)
                # Note: join_condition already has parent_1_alias and parent_2_alias format
                # We need to replace parent_1_alias with node_to_alias[parent_1] if different
                final_join_condition = join_condition
                if parent_1 in node_to_alias and node_to_alias[parent_1] != parent_1_alias:
                    # Replace the full alias including the 't' prefix
                    final_join_condition = final_join_condition.replace(f"{parent_1_alias}.", f"{node_to_alias[parent_1]}.")
                # For parent_2, if it's a source node, keep parent_2_alias as is
                # If it's a join node, replace with node_to_alias[parent_2]
                if parent_2 in node_to_alias and node_to_alias[parent_2] != parent_2_alias:
                    final_join_condition = final_join_condition.replace(f"{parent_2_alias}.", f"{node_to_alias[parent_2]}.")
                
                sql_parts.append(f"{join_type} {parent_2_ref} ON {final_join_condition}")
                
                # The join node's "current" alias is the LEFT parent's alias (the accumulated result)
                # This ensures subsequent joins reference the correct table
                if parent_1 in node_to_alias:
                    node_to_alias[join_node_id] = node_to_alias[parent_1]
                else:
                    node_to_alias[join_node_id] = parent_1_alias
    
    sql = "\n".join(sql_parts)
    return sql
