from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, JSON, ARRAY, SmallInteger
from sqlalchemy.orm import relationship, backref
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.sql import func
import uuid

from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    auth_source = Column(String(50), default="local") # local, ldap
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    groups = relationship("Group", secondary="user_groups", backref="users")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roles = relationship("Role", secondary="group_roles", backref="groups")

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    permissions = relationship("Permission", secondary="role_permissions", backref="roles")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # e.g. 'dashboards:read', 'users:write'
    description = Column(Text)

class UserGroup(Base):
    __tablename__ = "user_groups"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)

class GroupRole(Base):
    __tablename__ = "group_roles"
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)

class LineOfBusiness(Base):
    __tablename__ = "lines_of_business"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(80))
    color = Column(String(7))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LOBMember(Base):
    __tablename__ = "lob_members"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id", ondelete="CASCADE"), primary_key=True)

class Theme(Base):
    __tablename__ = "themes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    config = Column(JSONB, nullable=False)

class Datasource(Base):
    __tablename__ = "datasources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    engine = Column(String(50), nullable=False) # postgres, mysql, bigquery
    connection_uri = Column(Text, nullable=False)
    advanced_properties = Column(JSONB, default={}) # e.g. {"impersonate_user": true}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    datasource_id = Column(Integer, ForeignKey("datasources.id", ondelete="CASCADE"), nullable=True) # made nullable for composite datasets
    dataset_type = Column(String(20), default="sql") # sql, flow
    schema_name = Column(String(255))
    table_name = Column(String(255))
    custom_sql = Column(Text)
    description = Column(Text)
    flow_config = Column(JSONB) # Stores React Flow nodes and edges
    schema_metadata = Column(JSONB)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    columns = relationship("DatasetColumn", backref="dataset", cascade="all, delete-orphan")
    metrics = relationship("DatasetMetric", backref="dataset", cascade="all, delete-orphan")
    calculated_columns = relationship("DatasetCalculatedColumn", backref="dataset", cascade="all, delete-orphan")
    rls_rules = relationship("RowLevelSecurity", secondary="rls_datasets", back_populates="datasets")

class RLSDataset(Base):
    __tablename__ = "rls_datasets"
    rls_id = Column(Integer, ForeignKey("row_level_security.id", ondelete="CASCADE"), primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)

class RLSRole(Base):
    __tablename__ = "rls_roles"
    rls_id = Column(Integer, ForeignKey("row_level_security.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

class RowLevelSecurity(Base):
    __tablename__ = "row_level_security"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    filter_type = Column(String(20), default="regular") # regular, base
    clause = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("Role", secondary="rls_roles")
    datasets = relationship("Dataset", secondary="rls_datasets", back_populates="rls_rules")

class Dashboard(Base):
    __tablename__ = "dashboards"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id"))
    layout = Column(JSONB, nullable=False, default=[])
    theme_id = Column(Integer, ForeignKey("themes.id"))
    tags = Column(ARRAY(String))
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    background_color = Column(String(20), default="#f8fafc")
    text_color = Column(String(20), default="#0f172a")
    description_color = Column(String(20), default="#64748b")
    icon_color = Column(String(20), nullable=True)
    title_font_size = Column(Integer, default=15)
    subtitle_font_size = Column(Integer, default=10)
    logo_size = Column(String(20), default="medium")
    filter_config = Column(JSONB, default=[])
    filter_presets = Column(JSONB, default=[])
    logo_url = Column(String(512))
    grid_gap = Column(Integer, default=16)
    grid_cols = Column(Integer, default=12)
    row_height = Column(Integer, default=80)
    echarts_theme = Column(String(50), default="default")
    llm_config = Column(JSONB, default={})
    cache_config = Column(JSONB, default={})
    search_vector = Column(TSVECTOR)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roles = relationship("Role", secondary="dashboard_roles", backref="dashboards")
    favorited_by = relationship("User", secondary="dashboard_favorites", backref="favorite_dashboards")
    owner = relationship("User", foreign_keys=[owner_id])
    co_owners = relationship("User", secondary="dashboard_co_owners", backref="co_owned_dashboards")

class DashboardOwner(Base):
    __tablename__ = "dashboard_co_owners"
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

class DashboardRole(Base):
    __tablename__ = "dashboard_roles"
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

class DashboardFavorite(Base):
    __tablename__ = "dashboard_favorites"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), primary_key=True)

class ChartFolder(Base):
    __tablename__ = "chart_folders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    parent_id = Column(Integer, ForeignKey("chart_folders.id", ondelete="CASCADE"), nullable=True)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id", ondelete="CASCADE"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children = relationship("ChartFolder", backref=backref("parent", remote_side=[id]))
    charts = relationship("Chart", backref="folder_obj", cascade="all, delete-orphan")

class Chart(Base):
    __tablename__ = "charts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    chart_type = Column(String(50), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    query_config = Column(JSONB, nullable=False)
    visual_config = Column(JSONB, nullable=False)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    folder_id = Column(Integer, ForeignKey("chart_folders.id", ondelete="SET NULL"), nullable=True)
    tags = Column(ARRAY(String), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class RefreshSchedule(Base):
    __tablename__ = "refresh_schedules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    target_type = Column(String(20), nullable=False)
    target_id = Column(Integer, nullable=False)
    cron_expression = Column(String(100), nullable=False)
    timezone = Column(String(60), default="UTC")
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True))
    last_run_status = Column(String(20))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

class EmailReport(Base):
    __tablename__ = "email_reports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    schedule_id = Column(Integer, ForeignKey("refresh_schedules.id"))
    recipients = Column(JSONB, nullable=False)
    subject_template = Column(Text, nullable=False)
    body_template = Column(Text, nullable=False)
    include_charts = Column(ARRAY(Integer))
    attachments = Column(JSONB)
    reply_to = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

class EmailReportLog(Base):
    __tablename__ = "email_report_logs"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("email_reports.id"))
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20))
    recipients_ok = Column(Integer)
    error_detail = Column(Text)

class AIQuery(Base):
    __tablename__ = "ai_queries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    prompt = Column(Text, nullable=False)
    generated_sql = Column(Text)
    status = Column(String(20))
    feedback = Column(SmallInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), default="New Conversation")
    bot_id = Column(String(50)) # query, insight, anomaly, predict
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("AIChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="AIChatMessage.created_at")

class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"))
    role = Column(String(20), nullable=False) # user, ai
    content = Column(Text, nullable=False)
    reasoning_content = Column(Text, nullable=True)
    tool_calls = Column(JSONB, nullable=True)
    tool_results = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AIChatSession", back_populates="messages")

class AIBot(Base):
    __tablename__ = "ai_bots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    bot_id = Column(String(50), unique=True, index=True)
    avatar_config = Column(JSONB, default={}) # { icon, color, tagline }
    llm_config = Column(JSONB, default={}) # { base_url, model_name, api_key, headers, system_prompt }
    knowledge_config = Column(JSONB, default={}) # { dataset_ids: [] }
    tools_config = Column(JSONB, default={}) # { enable_sql_tool: bool, mcp_servers: [{url, api_key, etc}] }
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    lob_id = Column(Integer, ForeignKey("lines_of_business.id", ondelete="CASCADE"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class DatasetColumn(Base):
    __tablename__ = "dataset_columns"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    column_name = Column(String(200), nullable=False)
    friendly_name = Column(String(200))
    description = Column(Text)
    data_type = Column(String(50))
    format_string = Column(String(100))
    is_filterable = Column(Boolean, default=False)
    is_groupable = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    expression = Column(Text)

class DatasetMetric(Base):
    __tablename__ = "dataset_metrics"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    name = Column(String(200), nullable=False)
    friendly_name = Column(String(200))
    expression = Column(Text, nullable=False)
    description = Column(Text)

class DatasetCalculatedColumn(Base):
    __tablename__ = "dataset_calculated_columns"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String(200), nullable=False)
    friendly_name = Column(String(200))
    expression = Column(Text, nullable=False)
    description = Column(Text)
    data_type = Column(String(50))
    is_filterable = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DatasetJoin(Base):
    __tablename__ = "dataset_joins"
    id = Column(Integer, primary_key=True, index=True)
    left_dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    right_dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    join_type = Column(String(50), default="INNER") # INNER, LEFT, RIGHT, FULL
    join_condition = Column(Text, nullable=False) # e.g. "datasets_1.id = datasets_2.user_id"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    left_dataset = relationship("Dataset", foreign_keys=[left_dataset_id], backref=backref("left_joins", cascade="all, delete-orphan"))
    right_dataset = relationship("Dataset", foreign_keys=[right_dataset_id], backref=backref("right_joins", cascade="all, delete-orphan"))

class DataMart(Base):
    __tablename__ = "datamarts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default="database")
    color = Column(String(20), default="#4f46e5")
    lob_id = Column(Integer, ForeignKey("lines_of_business.id", ondelete="CASCADE"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roles = relationship("Role", secondary="datamart_roles", backref="datamarts")
    datasets = relationship("Dataset", secondary="datamart_datasets", backref="datamarts")
    owner = relationship("User", foreign_keys=[owner_id])

class DataMartRole(Base):
    __tablename__ = "datamart_roles"
    datamart_id = Column(Integer, ForeignKey("datamarts.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

class DataMartDataset(Base):
    __tablename__ = "datamart_datasets"
    datamart_id = Column(Integer, ForeignKey("datamarts.id", ondelete="CASCADE"), primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)

class JobLog(Base):
    __tablename__ = "job_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), nullable=False)
    task_name = Column(String(200), nullable=False)
    run_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    status = Column(String(20), nullable=False) # SUCCESS, FAILURE, RUNNING
    message = Column(Text)
    execution_time_ms = Column(Integer)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
class LDAPConfig(Base):
    __tablename__ = "ldap_config"
    id = Column(Integer, primary_key=True, index=True)
    is_enabled = Column(Boolean, default=False)
    server_uri = Column(String(255))
    bind_dn = Column(String(255))
    bind_password = Column(String(255))
    base_dn = Column(String(255))
    user_search_base = Column(String(255))
    user_object_class = Column(String(100), default="person")
    user_id_attribute = Column(String(100), default="uid")
    user_email_attribute = Column(String(100), default="mail")
    user_name_attribute = Column(String(100), default="cn")
    group_search_base = Column(String(255))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SavedQuery(Base):
    __tablename__ = "saved_queries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sql = Column(Text, nullable=False)
    datasource_id = Column(Integer, ForeignKey("datasources.id", ondelete="CASCADE"), nullable=True, index=True)
    datamart_id = Column(Integer, ForeignKey("datamarts.id", ondelete="CASCADE"), nullable=True, index=True)
    schema_name = Column(String(255))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    folder = Column(String(100), index=True)
    description = Column(Text)
    query_config = Column(JSONB, nullable=True)  # Store full query configuration (dimensions, metrics, filters, joins, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), index=True) 
    details = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", foreign_keys=[user_id])

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
