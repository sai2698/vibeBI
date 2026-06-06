from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict
from jinja2 import Template

from app.models import RowLevelSecurity, User

async def get_applicable_rls_clauses(
    db: AsyncSession, 
    dataset_ids: List[int], 
    current_user: User,
    engine_type: str = "postgres"
) -> Dict[int, List[str]]:
    """
    Evaluates RLS rules for given datasets and returns a list of SQL clauses to inject.
    """
    if not dataset_ids:
        return {}
        
    query = (
        select(RowLevelSecurity)
        .options(selectinload(RowLevelSecurity.roles), selectinload(RowLevelSecurity.datasets))
        .filter(RowLevelSecurity.datasets.any(RowLevelSecurity.datasets.property.mapper.class_.id.in_(dataset_ids)))
    )
    result = await db.execute(query)
    rules = result.scalars().all()
    
    # Get current user's role IDs
    user_role_ids = {r.id for g in current_user.groups for r in g.roles} if current_user.groups else set()
    
    rls_clauses = {ds_id: [] for ds_id in dataset_ids}
    
    for rule in rules:
        rule_role_ids = {r.id for r in rule.roles}
        
        applies = False
        if rule.filter_type == 'base':
            # Base filters apply to everyone EXCEPT the specified roles
            # If no roles are specified, it applies to everyone.
            if not rule_role_ids or not rule_role_ids.intersection(user_role_ids):
                applies = True
        elif rule.filter_type == 'regular':
            # Regular filters apply ONLY to the specified roles
            if rule_role_ids and rule_role_ids.intersection(user_role_ids):
                applies = True
                
        if applies and rule.clause:
            try:
                template = Template(rule.clause)
                rendered_clause = template.render(current_user=current_user)
                if rendered_clause.strip():
                    # Adapt ANSI double quotes to engine specific identifier quotes
                    if "mysql" in engine_type.lower():
                        rendered_clause = rendered_clause.replace('"', '`')
                    
                    for ds in rule.datasets:
                        if ds.id in rls_clauses:
                            rls_clauses[ds.id].append(rendered_clause.strip())
            except Exception as e:
                # If Jinja rendering fails, fallback to strict block (0=1) to fail securely
                for ds in rule.datasets:
                    if ds.id in rls_clauses:
                        rls_clauses[ds.id].append("0=1")
                
    return rls_clauses
