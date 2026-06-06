from typing import Dict, Type
from .base import BaseTool
from .sql import RunSQLTool
from .chart import RenderChartTool

# Registry of available tools
AVAILABLE_TOOLS: Dict[str, Type[BaseTool]] = {
    "run_sql_query": RunSQLTool,
    "render_chart": RenderChartTool
}

def get_tool_instance(name: str, **kwargs) -> BaseTool:
    tool_class = AVAILABLE_TOOLS.get(name)
    if not tool_class:
        raise ValueError(f"Tool {name} not found in registry.")
    return tool_class(**kwargs)
