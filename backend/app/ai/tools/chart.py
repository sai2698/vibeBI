from typing import Dict, Any, List
from .base import BaseTool

class RenderChartTool(BaseTool):
    name = "render_chart"
    description = "Render a data visualization chart using ECharts. Use this immediately after running a SQL query to visualize the returned data if the user asked for a chart, graph, or visual. Provide the exact chart configuration."
    parameters = {
        "type": "object",
        "properties": {
            "chartType": {
                "type": "string",
                "enum": ["bar", "line", "area", "pie", "donut", "scatter", "radar", "funnel", "treemap", "heatmap", "kpi", "table"],
                "description": "The type of chart to render. E.g. bar, line, pie."
            },
            "title": {
                "type": "string",
                "description": "Optional title for the chart"
            },
            "data": {
                "type": "object",
                "properties": {
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Labels for the X-axis (e.g. ['Jan', 'Feb', 'Mar'])"
                    },
                    "series": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Name of the data series"},
                                "data": {"type": "array", "items": {"type": "number"}, "description": "Array of numerical values matching the categories"}
                            },
                            "required": ["name", "data"]
                        }
                    }
                },
                "required": ["series"]
            }
        },
        "required": ["chartType", "data"]
    }

    async def execute(self, chartType: str, data: dict, title: str = None) -> str:
        # The execution merely acknowledges success. The actual rendering is handled client-side.
        return f"Successfully pushed {chartType} chart configuration to client UI."
