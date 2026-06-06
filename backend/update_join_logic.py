import re

# Read the original file
with open('/home/naveen/NAVYA/backend/app/charts/utils.py', 'r') as f:
    content = f.read()

# Find and replace the join building section
old_join_logic = '''    # Build FROM and JOIN
    if not is_multi:
        ds_id = list(datasets.keys())[0]
        dataset = datasets[ds_id]
        from_clause = get_dataset_ref(ds_id, dataset)
    else:
        # Multi-table JOIN logic with robust path finding and cycle detection
        if not required_dataset_ids:
            return "", [], [], False
            
        base_ds_id = list(required_dataset_ids)[0]
        base_ds = datasets[base_ds_id]
        from_clause = get_dataset_ref(base_ds_id, base_ds, f"ds_{base_ds_id}")
        
        joined_ids = {base_ds_id}
        remaining_ids = required_dataset_ids - joined_ids
        
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
        join_graph: Dict[int, List[object]] = {}
        for ds_id in required_dataset_ids:
            join_graph[ds_id] = []
        
        for j in all_joins:
            if j.left_dataset_id in required_dataset_ids and j.right_dataset_id in required_dataset_ids:
                join_graph[j.left_dataset_id].append(j)
                join_graph[j.right_dataset_id].append(j)
        
        # BFS-based join path finder with cycle detection
        join_path: List[object] = []
        visited_edges: set = set()
        join_warnings: List[Dict] = []
        
        def find_best_join(current_id: int, target_ids: Set[int]) -> object:
            """Find the best join from current_id to an unvisited target."""
            candidates = []
            
            for j in join_graph.get(current_id, []):
                # Determine the other endpoint
                other_id = j.right_dataset_id if j.left_dataset_id == current_id else j.left_dataset_id
                
                # Skip if already visited
                if other_id not in target_ids:
                    continue
                
                # Create edge identifier (sorted to avoid duplicates)
                edge_id = tuple(sorted([j.left_dataset_id, j.right_dataset_id]))
                
                # Skip if this edge was already used
                if edge_id in visited_edges:
                    continue
                
                candidates.append((other_id, j))
            
            if not candidates:
                return None
            
            # Prefer INNER joins over LEFT joins (more restrictive)
            candidates.sort(key=lambda x: (0 if x[1].join_type == "INNER" else 1, x[0]))
            return candidates[0]
        
        # Iteratively build join path
        if all_joins:
            while remaining_ids:
                made_join = False
                best_join_info = None
                
                # Try to find a join from any visited node to an unvisited node
                for current_id in list(joined_ids):
                    join_info = find_best_join(current_id, remaining_ids)
                    if join_info:
                        best_join_info = (current_id, join_info)
                        break
                
                if best_join_info:
                    current_id, (target_id, join_obj) = best_join_info
                    
                    # Mark edge as visited
                    edge_id = tuple(sorted([join_obj.left_dataset_id, join_obj.right_dataset_id]))
                    visited_edges.add(edge_id)
                    
                    # Determine direction
                    if join_obj.left_dataset_id == current_id:
                        right_ds = datasets[join_obj.right_dataset_id]
                        join_direction = "left_to_right"
                    else:
                        right_ds = datasets[join_obj.left_dataset_id]
                        join_direction = "right_to_left"
                    
                    tbl_ref = get_dataset_ref(
                        join_obj.right_dataset_id if join_direction == "left_to_right" else join_obj.left_dataset_id,
                        right_ds,
                        f"ds_{join_obj.right_dataset_id if join_direction == 'left_to_right' else join_obj.left_dataset_id}"
                    )
                    
                    from_clause += f" {join_obj.join_type} JOIN {tbl_ref} ON {join_obj.join_condition}"
                    applied_joins_info.append({
                        "type": join_obj.join_type,
                        "condition": join_obj.join_condition,
                        "target_dataset": right_ds.name,
                        "direction": join_direction
                    })
                    
                    joined_ids.add(target_id)
                    remaining_ids.remove(target_id)
                    made_join = True
                else:
                    # No more joins possible - check for cycles or disconnected components
                    break

        # Check for remaining unconnected datasets
        if remaining_ids:
            has_missing_joins = True
            # Find which datasets couldn't be connected
            disconnected = remaining_ids
            # Suggest potential joins
            suggested_joins = []
            for ds_id in disconnected:
                ds = datasets[ds_id]
                available_joins = [
                    j for j in all_joins
                    if (j.left_dataset_id == ds_id or j.right_dataset_id == ds_id)
                    and (j.left_dataset_id not in disconnected and j.right_dataset_id not in disconnected)
                ]
                if available_joins:
                    for aj in available_joins:
                        other_id = aj.right_dataset_id if aj.left_dataset_id == ds_id else aj.left_dataset_id
                        other_ds = datasets.get(other_id)
                        if other_ds:
                            suggested_joins.append({
                                "from": ds.name,
                                "to": other_ds.name,
                                "condition": aj.join_condition,
                                "type": aj.join_type
                            })
            
            if suggested_joins:
                join_warnings.append({
                    "type": "disconnected_datasets",
                    "message": f"Could not connect: {', '.join([datasets[d].name for d in disconnected])}",
                    "suggestions": suggested_joins
                })
        
        # Detect potential cycles (multiple paths to same dataset)
        if len(visited_edges) > 0:
            # Check if any dataset can be reached through multiple paths
            for ds_id in required_dataset_ids:
                edge_count = sum(1 for j in all_joins 
                               if (j.left_dataset_id == ds_id or j.right_dataset_id == ds_id)
                               and tuple(sorted([j.left_dataset_id, j.right_dataset_id])) in visited_edges)
                if edge_count > 2:  # More than 2 edges connected to a node suggests potential cycle
                    ds = datasets[ds_id]
                    connected_to = []
                    for j in all_joins:
                        if j.left_dataset_id == ds_id and tuple(sorted([j.left_dataset_id, j.right_dataset_id])) in visited_edges:
                            connected_to.append(datasets.get(j.right_dataset_id, type('obj', (object,), {'name': 'Unknown'})()).name)
                        elif j.right_dataset_id == ds_id and tuple(sorted([j.left_dataset_id, j.right_dataset_id])) in visited_edges:
                            connected_to.append(datasets.get(j.left_dataset_id, type('obj', (object,), {'name': 'Unknown'})()).name)
                    
                    if len(connected_to) > 2:
                        join_warnings.append({
                            "type": "potential_cycle",
                            "message": f"Dataset '{ds.name}' has multiple join paths which may create a cycle",
                            "connected_to": connected_to,
                            "recommendation": "Review join conditions to ensure you're not creating a Cartesian product"
                        })

    sql_str = f"SELECT {', '.join(select_cols)} FROM {from_clause}{where_clause}"
    
    if group_by:
        sql_str += f" GROUP BY {', '.join(group_by)}"
    
    if is_oracle:
        sql_str += f" FETCH FIRST {limit} ROWS ONLY"
    else:
        sql_str += f" LIMIT {limit}"
    
    return sql_str, select_cols, applied_joins_info, has_missing_joins, join_warnings'''

new_join_logic = '''    # Build FROM and JOIN
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
    
    return beautified_sql, select_cols, applied_joins_info, has_missing_joins, join_warnings, sql_options'''

if old_join_logic in content:
    content = content.replace(old_join_logic, new_join_logic)
    
    # Update function signature
    content = content.replace(
        'def build_sql_query(dataset_or_datasets, query_config: Dict[str, Any], filters: Dict[str, Any] = None, engine_type: str = "postgres", joins: List[Any] = None, rls_clauses: Dict[int, List[str]] = None) -> Tuple[str, List[str], List[Dict[str, Any]], bool, List[Dict]]:',
        'def build_sql_query(dataset_or_datasets, query_config: Dict[str, Any], filters: Dict[str, Any] = None, engine_type: str = "postgres", joins: List[Any] = None, rls_clauses: Dict[int, List[str]] = None) -> Tuple[str, List[str], List[Dict[str, Any]], bool, List[Dict], List[Dict]]:'
    )
    
    with open('/home/naveen/NAVYA/backend/app/charts/utils.py', 'w') as f:
        f.write(content)
    print("File updated successfully!")
else:
    print("Could not find the old join logic to replace. The file structure may have changed.")
