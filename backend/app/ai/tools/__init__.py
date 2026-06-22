from typing import Dict, Type
from .base import BaseTool
from .sql import RunSQLTool
from .chart import RenderChartTool
from .dashboard import (
    CreateGenieDashboardTool,
    AddChartToDashboardTool,
    UpdateDashboardLayoutTool,
    UpdateDashboardThemeTool,
    AddDashboardFilterTool,
    DeleteDashboardWidgetTool,
    AutoOrganizeDashboardTool
)

# Registry of available tools
AVAILABLE_TOOLS: Dict[str, Type[BaseTool]] = {
    "run_sql_query": RunSQLTool,
    "render_chart": RenderChartTool,
    "create_genie_dashboard": CreateGenieDashboardTool,
    "add_chart_to_dashboard": AddChartToDashboardTool,
    "update_dashboard_layout": UpdateDashboardLayoutTool,
    "update_dashboard_theme": UpdateDashboardThemeTool,
    "add_dashboard_filter": AddDashboardFilterTool,
    "delete_dashboard_widget": DeleteDashboardWidgetTool,
    "auto_organize_dashboard": AutoOrganizeDashboardTool
}

def get_tool_instance(name: str, **kwargs) -> BaseTool:
    tool_class = AVAILABLE_TOOLS.get(name)
    if not tool_class:
        raise ValueError(f"Tool {name} not found in registry.")
    return tool_class(**kwargs)
