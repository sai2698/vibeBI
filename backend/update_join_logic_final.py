#!/usr/bin/env python3
"""Script to update utils.py with new spanning tree join logic."""

# Read the file
with open('/home/naveen/NAVYA/backend/app/charts/utils.py', 'r') as f:
    lines = f.readlines()

# Find start and end lines
start_line = None
end_line = None

for i, line in enumerate(lines):
    if '# Build FROM and JOIN' in line:
        start_line = i
    if start_line is not None and 'return sql_str, select_cols, applied_joins_info, has_missing_joins, join_warnings' in line:
        end_line = i
        break

print(f"Found section from line {start_line + 1} to {end_line + 1}")

if start_line is None or end_line is None:
    print("ERROR: Could not find the section to replace")
    exit(1)

# New code to insert (as a single string with proper newlines)
new_code = '''    # Build FROM and JOIN
    if not is_multi:
        ds_id = list(datasets.keys())[0]
        dataset = datasets[ds_id]
        from_clause = get_dataset_ref(ds_id, dataset)
        return from_clause, [], [], False, [], []
        
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
        
        if has_multiple_paths and sql_options:
            join_warnings[0]["sql_options"] = sql_options
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
    
    if is_oracle:
        sql_str += f" FETCH FIRST {limit} ROWS ONLY"
    else:
        sql_str += f" LIMIT {limit}"
    
    # Beautify SQL
    def beautify_sql(sql: str) -> str:
        import re
        sql = re.sub(r'\\b(SELECT)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(FROM)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(LEFT|RIGHT|INNER|FULL|OUTER)?\\s*(JOIN)\\b', r'\\n\\1 \\2', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(WHERE)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(GROUP BY)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(ORDER BY)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(LIMIT|FETCH FIRST)\\b', r'\\n\\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\b(AND|OR)\\b', r'\\n  \\1', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\\n\\s*\\n', r'\\n', sql)
        return sql.strip()
    
    for option in sql_options:
        option["beautified_sql"] = beautify_sql(option["sql"])
    
    beautified_sql = beautify_sql(sql_str)
    
    return beautified_sql, select_cols, applied_joins_info, has_missing_joins, join_warnings, sql_options
'''

# Replace the section
new_lines = lines[:start_line] + [new_code + '\n'] + lines[end_line + 1:]

# Write back
with open('/home/naveen/NAVYA/backend/app/charts/utils.py', 'w') as f:
    f.writelines(new_lines)

print("File updated successfully!")
print(f"Replaced {end_line - start_line + 1} lines with new spanning tree logic")
