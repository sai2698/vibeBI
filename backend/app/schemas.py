from pydantic import BaseModel, EmailStr, UUID4, Field
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# --- Permissions ---
class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: int
    class Config:
        from_attributes = True

# --- Roles ---
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    permissions: List[PermissionResponse] = []
    class Config:
        from_attributes = True

# --- Groups ---
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    role_ids: List[int] = []

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    role_ids: Optional[List[int]] = None

class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    roles: List[RoleResponse] = []
    class Config:
        from_attributes = True

# --- Users ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    group_ids: List[int] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    group_ids: Optional[List[int]] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    roles: List[str] = []
    permissions: List[str] = []
    groups: List[GroupResponse] = []
    class Config:
        from_attributes = True

class UserResponseBasic(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    class Config:
        from_attributes = True

class RLSBase(BaseModel):
    name: str
    description: Optional[str] = None
    filter_type: str = "regular"
    dataset_ids: List[int] = []
    clause: str
    role_ids: List[int] = []

class RLSCreate(RLSBase):
    pass

class RLSUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filter_type: Optional[str] = None
    dataset_ids: Optional[List[int]] = None
    clause: Optional[str] = None
    role_ids: Optional[List[int]] = None

class RLSResponse(RLSBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Other Schemas ---
class LineOfBusinessBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = True

class LineOfBusinessCreate(LineOfBusinessBase):
    pass

class LineOfBusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class LineOfBusinessResponse(LineOfBusinessBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DatasourceBase(BaseModel):
    name: str
    engine: str
    connection_uri: str
    advanced_properties: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DatasourceCreate(DatasourceBase):
    pass

class DatasourceUpdate(BaseModel):
    name: Optional[str] = None
    engine: Optional[str] = None
    connection_uri: Optional[str] = None
    advanced_properties: Optional[Dict[str, Any]] = None

class DatasourceResponse(DatasourceBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DatasourceTestRequest(BaseModel):
    engine: str
    connection_uri: str
    advanced_properties: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DatasourceTestResponse(BaseModel):
    success: bool
    message: str

class DatasetBase(BaseModel):
    name: str
    datasource_id: Optional[int] = None
    dataset_type: Optional[str] = "sql"
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    custom_sql: Optional[str] = None
    description: Optional[str] = None
    flow_config: Optional[dict] = None
    schema_metadata: Optional[dict] = None
    lob_id: Optional[int] = None

class DatasetCreate(DatasetBase):
    pass

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    datasource_id: Optional[int] = None
    dataset_type: Optional[str] = None
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    custom_sql: Optional[str] = None
    description: Optional[str] = None
    flow_config: Optional[dict] = None
    schema_metadata: Optional[dict] = None

class DatasetColumnBase(BaseModel):
    column_name: str
    friendly_name: Optional[str] = None
    description: Optional[str] = None
    data_type: Optional[str] = None
    format_string: Optional[str] = None
    is_filterable: Optional[bool] = False
    is_groupable: Optional[bool] = True
    is_visible: Optional[bool] = True
    expression: Optional[str] = None

class DatasetColumnResponse(DatasetColumnBase):
    id: int
    class Config:
        from_attributes = True

class DatasetColumnUpdate(BaseModel):
    friendly_name: Optional[str] = None
    description: Optional[str] = None
    data_type: Optional[str] = None
    format_string: Optional[str] = None
    is_filterable: Optional[bool] = None
    is_groupable: Optional[bool] = None
    is_visible: Optional[bool] = None
    expression: Optional[str] = None

class DatasetMetricBase(BaseModel):
    name: str
    friendly_name: Optional[str] = None
    expression: str
    description: Optional[str] = None

class DatasetMetricUpdate(BaseModel):
    name: Optional[str] = None
    friendly_name: Optional[str] = None
    expression: Optional[str] = None
    description: Optional[str] = None

class DatasetMetricResponse(DatasetMetricBase):
    id: int
    class Config:
        from_attributes = True

class DatasetCalculatedColumnBase(BaseModel):
    name: str
    friendly_name: Optional[str] = None
    expression: str
    description: Optional[str] = None
    data_type: Optional[str] = None
    is_filterable: Optional[bool] = True
    is_visible: Optional[bool] = True

class DatasetCalculatedColumnUpdate(BaseModel):
    name: Optional[str] = None
    friendly_name: Optional[str] = None
    expression: Optional[str] = None
    description: Optional[str] = None
    data_type: Optional[str] = None
    is_filterable: Optional[bool] = None
    is_visible: Optional[bool] = None

class DatasetCalculatedColumnResponse(DatasetCalculatedColumnBase):
    id: int
    dataset_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class DatasetJoinBase(BaseModel):
    left_dataset_id: int
    right_dataset_id: int
    join_type: str = "INNER"
    join_condition: str

class DatasetJoinCreate(DatasetJoinBase):
    pass

class DatasetJoinUpdate(BaseModel):
    join_type: Optional[str] = None
    join_condition: Optional[str] = None

class DatasetJoinResponse(DatasetJoinBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DatasetResponse(DatasetBase):
    id: int
    created_at: datetime
    lob_id: Optional[int] = None
    columns: List[DatasetColumnResponse] = []
    metrics: List[DatasetMetricResponse] = []
    calculated_columns: List[DatasetCalculatedColumnResponse] = []
    class Config:
        from_attributes = True

class SQLExecuteRequest(BaseModel):
    datasource_id: int
    query: str
    limit: Optional[int] = 100

class SQLExecuteResponse(BaseModel):
    columns: List[str]
    rows: List[dict]
    execution_time_ms: float
    error: Optional[str] = None

class ChartFolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    lob_id: Optional[int] = None

class ChartFolderCreate(ChartFolderBase):
    pass

class ChartFolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class ChartFolderResponse(ChartFolderBase):
    id: int
    owner_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ChartBase(BaseModel):
    title: str
    chart_type: str
    dataset_id: Optional[int] = None
    query_config: dict
    visual_config: dict
    lob_id: Optional[int] = None
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = []

class ChartCreate(ChartBase):
    pass

class ChartResponse(ChartBase):
    id: int
    owner_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ChartDataRequest(BaseModel):
    chart_id: int
    datamart_id: Optional[int] = None
    dashboard_id: Optional[int] = None
    dashboard_name: Optional[str] = None
    filters: Optional[dict] = None
    query_config: Optional[dict] = None

class ChartPreviewRequest(BaseModel):
    dataset_id: Optional[int] = None
    datamart_id: Optional[int] = None
    dashboard_id: Optional[int] = None
    query_config: dict
    filters: Optional[dict] = None

class DashboardBase(BaseModel):
    title: str
    description: Optional[str] = None
    lob_id: Optional[int] = None
    layout: Any
    theme_id: Optional[int] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = False
    is_featured: Optional[bool] = False
    background_color: Optional[str] = "#f8fafc"
    text_color: Optional[str] = "#0f172a"
    description_color: Optional[str] = "#64748b"
    icon_color: Optional[str] = None
    title_font_size: Optional[int] = 15
    subtitle_font_size: Optional[int] = 10
    logo_size: Optional[str] = "medium"
    filter_config: Optional[List[Any]] = []
    filter_presets: Optional[List[Any]] = []
    logo_url: Optional[str] = None
    grid_gap: Optional[int] = 16
    grid_cols: Optional[int] = 12
    row_height: Optional[int] = 80
    echarts_theme: Optional[str] = "default"
    llm_config: Optional[dict] = {}
    cache_config: Optional[dict] = {}

class DashboardCreate(DashboardBase):
    role_ids: List[int] = []
    co_owner_ids: List[UUID] = []

class DashboardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lob_id: Optional[int] = None
    layout: Optional[Any] = None
    theme_id: Optional[int] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_featured: Optional[bool] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    description_color: Optional[str] = None
    icon_color: Optional[str] = None
    title_font_size: Optional[int] = None
    subtitle_font_size: Optional[int] = None
    logo_size: Optional[str] = None
    filter_config: Optional[List[Any]] = None
    filter_presets: Optional[List[Any]] = None
    logo_url: Optional[str] = None
    grid_gap: Optional[int] = None
    grid_cols: Optional[int] = None
    row_height: Optional[int] = None
    echarts_theme: Optional[str] = None
    llm_config: Optional[dict] = None
    role_ids: Optional[List[int]] = None
    co_owner_ids: Optional[List[UUID]] = None
    cache_config: Optional[dict] = None

class DashboardResponse(DashboardBase):
    id: int
    owner_id: Optional[UUID] = None
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_favorite: bool = False
    role_ids: List[int] = []
    co_owners: List[UserResponseBasic] = []
    class Config:
        from_attributes = True

class ScheduleBase(BaseModel):
    name: str
    target_type: str
    target_id: int
    cron_expression: str
    timezone: Optional[str] = "UTC"
    is_active: Optional[bool] = True

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    class Config:
        from_attributes = True

class EmailReportBase(BaseModel):
    name: str
    schedule_id: int
    recipients: dict
    subject_template: str
    body_template: str
    is_active: Optional[bool] = True

class EmailReportCreate(EmailReportBase):
    pass

class EmailReportResponse(EmailReportBase):
    id: int
    class Config:
        from_attributes = True

class NLToSQLRequest(BaseModel):
    question: str
    datasource_id: int

class NLToSQLResponse(BaseModel):
    generated_sql: str
    explanation: str

class AISummaryRequest(BaseModel):
    chart_id: Optional[int] = None
    dashboard_id: Optional[int] = None

class AISummaryResponse(BaseModel):
    summary: str
    anomalies: List[str]
    recommendations: List[str]

class AIChatMessageSchema(BaseModel):
    id: int
    session_id: UUID4
    role: str
    content: str
    reasoning_content: Optional[str] = None
    tool_calls: Optional[List[dict]] = None
    tool_results: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AIChatSessionSchema(BaseModel):
    id: UUID4
    title: str
    bot_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[AIChatMessageSchema] = []

    class Config:
        from_attributes = True

class AIChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    bot_id: Optional[str] = "query"

class AIChatMessageCreate(BaseModel):
    content: str
    role: str = "user"
    context_dataset_ids: Optional[List[int]] = None
    llm_config_override: Optional[dict] = None
    dashboard_name: Optional[str] = None

class AIBotSchema(BaseModel):
    id: UUID4
    name: str
    description: Optional[str] = None
    bot_id: str
    avatar_config: dict
    llm_config: dict
    knowledge_config: dict
    tools_config: Optional[dict] = {}
    is_system: bool
    is_active: bool
    lob_id: Optional[int] = None
    owner_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AIBotCreate(BaseModel):
    name: str
    description: Optional[str] = None
    bot_id: str
    avatar_config: dict = {}
    llm_config: dict = {}
    knowledge_config: dict = {}
    tools_config: dict = {}
    lob_id: Optional[int] = None

class AIBotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bot_id: Optional[str] = None
    avatar_config: Optional[dict] = None
    llm_config: Optional[dict] = None
    knowledge_config: Optional[dict] = None
    tools_config: Optional[dict] = None
    lob_id: Optional[int] = None
    is_active: Optional[bool] = None
class LDAPConfigBase(BaseModel):
    is_enabled: bool = False
    server_uri: Optional[str] = None
    bind_dn: Optional[str] = None
    bind_password: Optional[str] = None
    base_dn: Optional[str] = None
    user_search_base: Optional[str] = None
    user_object_class: Optional[str] = "person"
    user_id_attribute: Optional[str] = "uid"
    user_email_attribute: Optional[str] = "mail"
    user_name_attribute: Optional[str] = "cn"
    group_search_base: Optional[str] = None

class LDAPConfigUpdate(LDAPConfigBase):
    pass

class LDAPConfigResponse(LDAPConfigBase):
    id: int
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class SavedQueryBase(BaseModel):
    name: str
    sql: str
    datasource_id: Optional[int] = None
    datamart_id: Optional[int] = None
    schema_name: Optional[str] = None
    folder: Optional[str] = None
    description: Optional[str] = None
    query_config: Optional[dict] = None

class SavedQueryCreate(SavedQueryBase):
    pass

class SavedQueryUpdate(BaseModel):
    name: Optional[str] = None
    sql: Optional[str] = None
    datasource_id: Optional[int] = None
    schema_name: Optional[str] = None
    folder: Optional[str] = None
    description: Optional[str] = None
    query_config: Optional[dict] = None

class SavedQueryResponse(SavedQueryBase):
    id: int
    owner_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class SavedQueryFolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class SavedQueryFolderResponse(BaseModel):
    name: str
    description: Optional[str] = None
    query_count: int = 0
    class Config:
        from_attributes = True

class SavedQueryFolderRename(BaseModel):
    old_name: str = Field(..., min_length=1, max_length=100)
    new_name: str = Field(..., min_length=1, max_length=100)

# Theme Schemas
class ThemeBase(BaseModel):
    name: str
    config: dict

class ThemeCreate(ThemeBase):
    pass

class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None

class ThemeResponse(ThemeBase):
    id: int
    class Config:
        from_attributes = True

# Data Mart Schemas
class DataMartBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "database"
    color: Optional[str] = "#4f46e5"
    lob_id: Optional[int] = None

class DataMartCreate(DataMartBase):
    role_ids: List[int] = []
    dataset_ids: List[int] = []
    lob_id: Optional[int] = None

class DataMartUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    role_ids: Optional[List[int]] = None
    dataset_ids: Optional[List[int]] = None
    lob_id: Optional[int] = None

class DataMartResponse(DataMartBase):
    id: int
    owner_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    role_ids: List[int] = []
    datasets: List[DatasetResponse] = []
    
    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[UUID] = None
    action: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
