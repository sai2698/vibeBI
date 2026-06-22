import time
from typing import Dict, Any, List, Optional
from app.ai.tools.base import BaseTool
from app.database import AsyncSessionLocal
from app.models import Dashboard, Chart, AIChatSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

class CreateGenieDashboardTool(BaseTool):
    name = "create_genie_dashboard"
    description = "Create a new blank Genie dashboard. Use this tool first when a user asks to create, build, or start a new dashboard."
    parameters = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "The title of the dashboard (e.g. 'Sales Operations Overview')"
            },
            "description": {
                "type": "string",
                "description": "A short explanation of what this dashboard tracks"
            },
            "dataset_ids": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "List of dataset IDs connected to this dashboard."
            }
        },
        "required": ["title"]
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, title: str, description: Optional[str] = None, dataset_ids: Optional[List[int]] = None) -> str:
        if not self.session_id:
            return "Error: No active AI session ID provided to the tool."

        async with AsyncSessionLocal() as db:
            # Fetch session to get user_id
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session:
                return "Error: AI chat session not found."

            # Create default page structure
            initial_pages = [
                {
                    "id": "page_1",
                    "name": "Page 1",
                    "layout": [],
                    "filter_config": [],
                    "filter_presets": []
                }
            ]

            new_dash = Dashboard(
                title=title,
                description=description,
                owner_id=session.user_id,
                layout=[],
                enable_pages=False,
                pages=initial_pages,
                background_color="#f8fafc",
                text_color="#0f172a",
                description_color="#64748b",
                echarts_theme="default",
                llm_config={"dataset_ids": dataset_ids or []}
            )
            db.add(new_dash)
            await db.flush() # Populate new_dash.id

            # Link dashboard to session
            session.dashboard_id = new_dash.id
            await db.commit()

            dash_id = new_dash.id
            return f'{{"status": "success", "message": "Dashboard created successfully.", "dashboard_id": {dash_id}}}'


class AddChartToDashboardTool(BaseTool):
    name = "add_chart_to_dashboard"
    description = "Create and add a new visualization chart widget to the active Genie dashboard layout."
    parameters = {
        "type": "object",
        "properties": {
            "chart_type": {
                "type": "string",
                "enum": ["bar", "line", "pie", "kpi", "table"],
                "description": "The type of visualization to add."
            },
            "title": {
                "type": "string",
                "description": "The title of the chart card."
            },
            "dataset_id": {
                "type": "integer",
                "description": "The ID of the dataset to source data from."
            },
            "query_config": {
                "type": "object",
                "description": "Configuration containing dimensions (grouped columns) and metrics (aggregations). EXTREMELY CRITICAL: The 'column' field for metrics MUST BE AN EXISTING REAL COLUMN in the dataset schema. NEVER invent arbitrary columns like 'cnt', 'count', or 'total'. To count rows, use an existing column (e.g., 'id') with agg 'count'. To do a DISTINCT count, use agg 'distinct_count' exactly. NEVER use 'sum' on a non-existent column to count. Example of distinct count: {'dimensions': ['department'], 'metrics': [{'column': 'employee_id', 'agg': 'distinct_count', 'alias': 'Unique Employees'}]}. Example of summing a real column: {'dimensions': ['category'], 'metrics': [{'column': 'sales', 'agg': 'sum', 'alias': 'Total Sales'}]}. LIMIT is optional."
            },
            "visual_config": {
                "type": "object",
                "description": "Visual settings for rendering the chart. E.g. {'color_palette': 'warm', 'show_legend': true}"
            },
            "w": {
                "type": "integer",
                "description": "Grid column width of the widget (1-12 columns). Default is 6."
            },
            "h": {
                "type": "integer",
                "description": "Grid row height of the widget. Default is 4."
            }
        },
        "required": ["chart_type", "title", "dataset_id", "query_config"]
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, chart_type: str, title: str, dataset_id: int, query_config: dict, visual_config: Optional[dict] = None, w: int = 6, h: int = 4) -> str:
        if not self.session_id:
            return "Error: No active AI session ID provided."

        async with AsyncSessionLocal() as db:
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard linked to this Genie Space. Create a dashboard first."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."

            # Save the chart metadata
            new_chart = Chart(
                title=title,
                chart_type=chart_type,
                dataset_id=dataset_id,
                query_config=query_config,
                visual_config=visual_config or {},
                owner_id=session.user_id
            )
            db.add(new_chart)
            await db.flush()

            # Add layout widget to active page or default page
            pages = list(dashboard.pages or [])
            if not pages:
                pages = [{
                    "id": "page_1",
                    "name": "Page 1",
                    "layout": [],
                    "filter_config": [],
                    "filter_presets": []
                }]

            active_page = pages[0]
            layout = list(active_page.get("layout", []))

            # Smart layout calculation: place next to existing or on a new row
            max_y = 0
            for item in layout:
                y_bottom = item.get("y", 0) + item.get("h", 0)
                if y_bottom > max_y:
                    max_y = y_bottom

            x_pos = 0
            y_pos = max_y

            # Try to pack horizontally if width fits
            row_widgets = [item for item in layout if item.get("y", 0) == max_y - h]
            if row_widgets:
                rightmost = max(item.get("x", 0) + item.get("w", 0) for item in row_widgets)
                if rightmost + w <= 12:
                    x_pos = rightmost
                    y_pos = max_y - h

            new_widget = {
                "i": f"widget_{int(time.time() * 1000)}",
                "x": x_pos,
                "y": y_pos,
                "w": w,
                "h": h,
                "chart_id": new_chart.id,
                "title": title,
                "widget_type": "chart"
            }
            layout.append(new_widget)
            active_page["layout"] = layout
            dashboard.pages = pages
            
            # Keep flat layout in sync for legacy compatibility
            dashboard.layout = layout

            flag_modified(dashboard, "pages")
            flag_modified(dashboard, "layout")

            await db.commit()
            chart_id_val = new_chart.id
            widget_id_val = new_widget["i"]
            return f'{{"status": "success", "message": "Chart added successfully.", "chart_id": {chart_id_val}, "widget_id": "{widget_id_val}"}}'


class UpdateDashboardLayoutTool(BaseTool):
    name = "update_dashboard_layout"
    description = "Rearrange widgets, change their sizes (w, h) and positions (x, y) on the canvas."
    parameters = {
        "type": "object",
        "properties": {
            "layout": {
                "type": "array",
                "description": "List of widgets with updated coordinates.",
                "items": {
                    "type": "object",
                    "properties": {
                        "i": {"type": "string", "description": "The unique widget ID"},
                        "x": {"type": "integer"},
                        "y": {"type": "integer"},
                        "w": {"type": "integer"},
                        "h": {"type": "integer"}
                    },
                    "required": ["i", "x", "y", "w", "h"]
                }
            }
        },
        "required": ["layout"]
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, layout: List[dict]) -> str:
        if not self.session_id:
            return "Error: No active AI session ID."

        async with AsyncSessionLocal() as db:
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard found in session."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."

            pages = list(dashboard.pages or [])
            if not pages:
                return "Error: No pages found on dashboard."

            active_page = pages[0]
            existing_layout = active_page.get("layout", [])

            # Update layout mappings
            layout_map = {item["i"]: item for item in layout}
            updated_layout = []
            for item in existing_layout:
                w_id = item["i"]
                if w_id in layout_map:
                    item.update(layout_map[w_id])
                updated_layout.append(item)

            active_page["layout"] = updated_layout
            dashboard.pages = pages
            dashboard.layout = updated_layout

            flag_modified(dashboard, "pages")
            flag_modified(dashboard, "layout")

            await db.commit()
            return '{"status": "success", "message": "Dashboard widget arrangement updated successfully."}'


class UpdateDashboardThemeTool(BaseTool):
    name = "update_dashboard_theme"
    description = "Update colors, spacing, font sizes, and styles of the Genie dashboard."
    parameters = {
        "type": "object",
        "properties": {
            "background_color": {"type": "string", "description": "Hex value for dashboard canvas background"},
            "text_color": {"type": "string", "description": "Hex value for primary text & headers"},
            "description_color": {"type": "string", "description": "Hex value for subtitles"},
            "echarts_theme": {"type": "string", "description": "ECharts theme name (e.g. 'dark', 'roma', 'vintage', 'default')"}
        }
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, background_color: Optional[str] = None, text_color: Optional[str] = None, description_color: Optional[str] = None, echarts_theme: Optional[str] = None) -> str:
        if not self.session_id:
            return "Error: No active AI session ID."

        async with AsyncSessionLocal() as db:
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard found in session."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."

            if background_color:
                dashboard.background_color = background_color
            if text_color:
                dashboard.text_color = text_color
            if description_color:
                dashboard.description_color = description_color
            if echarts_theme:
                dashboard.echarts_theme = echarts_theme

            await db.commit()
            return '{"status": "success", "message": "Dashboard styling and theme successfully updated."}'


class AddDashboardFilterTool(BaseTool):
    name = "add_dashboard_filter"
    description = "Add an interactive filter control at the top of the dashboard."
    parameters = {
        "type": "object",
        "properties": {
            "label": {"type": "string", "description": "Display label for the filter (e.g. 'Select Region')"},
            "column": {"type": "string", "description": "Database column name to filter on"},
            "type": {"type": "string", "enum": ["select", "text", "date_range"], "description": "UI input component style"},
            "dataset_id": {"type": "integer", "description": "Sourcing dataset ID. Optional. If omitted, it will automatically use the bot's default dataset."},
            "default_value": {"type": "string", "description": "Initial default value (comma-separated for multi-select)"}
        },
        "required": ["label", "column", "type"]
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, label: str, column: str, type: str, dataset_id: Optional[int] = None, default_value: Optional[str] = None) -> str:
        if not self.session_id:
            return "Error: No active AI session ID."

        async with AsyncSessionLocal() as db:
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard found in session."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."
                
            # If dataset_id is missing, find the bot's default dataset
            if not dataset_id:
                bot_res = await db.execute(select(AIBot).where(AIBot.bot_id == session.bot_id))
                bot = bot_res.scalar_one_or_none()
                if bot and bot.knowledge_config and bot.knowledge_config.get("dataset_ids"):
                    dataset_id = bot.knowledge_config["dataset_ids"][0]
                else:
                    return "Error: No dataset_id provided and no default dataset found in bot configuration."

            pages = list(dashboard.pages or [])
            if not pages:
                return "Error: No pages found."

            active_page = pages[0]
            filter_config = list(active_page.get("filter_config", []))

            new_filter = {
                "id": f"filter_{int(time.time() * 1000)}",
                "label": label,
                "column": column,
                "type": type,
                "source": "dynamic",
                "dataset_id": dataset_id,
                "value_column": column,
                "default_value": default_value,
                "is_required": False
            }
            filter_config.append(new_filter)
            active_page["filter_config"] = filter_config
            dashboard.pages = pages
            dashboard.filter_config = filter_config

            flag_modified(dashboard, "pages")
            flag_modified(dashboard, "filter_config")

            await db.commit()
            filter_id_val = new_filter["id"]
            return f'{{"status": "success", "message": "Filter added to dashboard.", "filter_id": "{filter_id_val}"}}'


class DeleteDashboardWidgetTool(BaseTool):
    name = "delete_dashboard_widget"
    description = "Delete a specific widget card from the dashboard layout."
    parameters = {
        "type": "object",
        "properties": {
            "widget_id": {"type": "string", "description": "The unique widget ID (starts with widget_)"}
        },
        "required": ["widget_id"]
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self, widget_id: str) -> str:
        if not self.session_id:
            return "Error: No active AI session ID."

        async with AsyncSessionLocal() as db:
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard found in session."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."

            pages = list(dashboard.pages or [])
            if not pages:
                return "Error: No pages found."

            active_page = pages[0]
            layout = list(active_page.get("layout", []))

            # Filter out the deleted widget
            updated_layout = [item for item in layout if item.get("i") != widget_id]
            
            active_page["layout"] = updated_layout
            dashboard.pages = pages
            dashboard.layout = updated_layout

            flag_modified(dashboard, "pages")
            flag_modified(dashboard, "layout")

            await db.commit()
            return f'{{"status": "success", "message": "Widget \'{widget_id}\' deleted successfully."}}'

class AutoOrganizeDashboardTool(BaseTool):
    name = "auto_organize_dashboard"
    description = "Automatically pack and organize all widgets on the dashboard into a clean, compact grid layout. Call this if the user asks to tidy, organize, pack, or fix the layout."
    parameters = {
        "type": "object",
        "properties": {}
    }

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.session_id = session_id

    async def execute(self) -> str:
        if not self.session_id:
            return "Error: No active AI session ID."

        async with AsyncSessionLocal() as db:
            from app.models import Chart
            session_uuid = self.session_id
            session_res = await db.execute(
                select(AIChatSession).where(AIChatSession.id == session_uuid)
            )
            session = session_res.scalar_one_or_none()
            if not session or not session.dashboard_id:
                return "Error: No active dashboard found in session."

            dash_res = await db.execute(
                select(Dashboard).where(Dashboard.id == session.dashboard_id)
            )
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                return "Error: Linked dashboard not found."

            pages = list(dashboard.pages or [])
            if not pages:
                return "Error: No pages found on dashboard."

            active_page = pages[0]
            existing_layout = active_page.get("layout", [])

            max_cols = dashboard.grid_cols or 12
            
            # 1. Fetch chart types to identify KPIs
            chart_ids = [w.get("chart_id") for w in existing_layout if w.get("chart_id")]
            chart_types = {}
            if chart_ids:
                charts_res = await db.execute(select(Chart).where(Chart.id.in_(chart_ids)))
                charts = charts_res.scalars().all()
                chart_types = {c.id: c.chart_type for c in charts}
                
            # 2. Sort widgets: KPIs first, then by original y, then x
            def sort_key(w):
                c_type = chart_types.get(w.get("chart_id"))
                is_kpi = 0 if c_type == 'kpi' else 1
                return (is_kpi, w.get("y", 0), w.get("x", 0))
                
            sorted_widgets = sorted(existing_layout, key=sort_key)
            
            # 3. Separate KPIs and others, and pack using skyline algorithm with a hard break
            kpi_widgets = []
            other_widgets = []
            for widget in sorted_widgets:
                c_type = chart_types.get(widget.get("chart_id"))
                if c_type == 'kpi':
                    kpi_widgets.append(widget)
                else:
                    other_widgets.append(widget)

            col_heights = [0] * max_cols
            updated_layout = []
            
            def pack_widget(widget):
                w = widget.get("w", 6)
                h = widget.get("h", 4)
                
                if w > max_cols:
                    w = max_cols
                
                # Find the position (x, y) that places the widget as high as possible (lowest y)
                best_y = float('inf')
                best_x = 0
                
                # Scan all valid x positions
                for x in range(max_cols - w + 1):
                    cand_y = max(col_heights[x:x+w])
                    if cand_y < best_y:
                        best_y = cand_y
                        best_x = x
                
                widget["x"] = best_x
                widget["y"] = best_y
                widget["w"] = w
                widget["h"] = h
                
                updated_layout.append(widget)
                
                for x in range(best_x, best_x + w):
                    col_heights[x] = best_y + h

            # Pack KPIs first
            for widget in kpi_widgets:
                pack_widget(widget)
                
            # Hard break: force all non-KPI charts to be below the lowest KPI
            if kpi_widgets:
                kpi_floor = max(col_heights)
                col_heights = [kpi_floor] * max_cols
                
            # Pack remaining charts
            for widget in other_widgets:
                pack_widget(widget)

            active_page["layout"] = updated_layout
            dashboard.pages = pages
            dashboard.layout = updated_layout

            flag_modified(dashboard, "pages")
            flag_modified(dashboard, "layout")

            await db.commit()
            return '{"status": "success", "message": "Dashboard successfully auto-organized into a compact grid."}'
