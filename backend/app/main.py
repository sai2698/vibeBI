from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.groups.router import router as groups_router
from app.roles.router import router as roles_router
from app.lob.router import router as lob_router
from app.datasources.router import router as datasources_router
from app.datasets.router import router as datasets_router
from app.sqllab.router import router as sqllab_router
from app.charts.router import router as charts_router
from app.dashboards.router import router as dashboards_router
from app.scheduler.router import router as scheduler_router
from app.mailer.router import router as mailer_router
from app.ai.router import router as ai_router
from app.settings.router import router as settings_router
from app.themes.router import router as themes_router
from app.chart_folders.router import router as chart_folders_router
from app.datamarts.router import router as datamarts_router
from app.rls.router import router as rls_router
from app.audit.router import router as audit_router
from app.openmetadata.router import router as openmetadata_router


from contextlib import asynccontextmanager
from app.scheduler.manager import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title="BI Platform API",
    description="Backend API for the BI Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "BI Platform API is running"}

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(groups_router)
app.include_router(roles_router)
app.include_router(lob_router)
app.include_router(datasources_router)
app.include_router(datasets_router)
app.include_router(sqllab_router)
app.include_router(charts_router)
app.include_router(dashboards_router)
app.include_router(scheduler_router)
app.include_router(mailer_router)
app.include_router(ai_router)
app.include_router(settings_router)
app.include_router(themes_router)
app.include_router(chart_folders_router)
app.include_router(datamarts_router, prefix="/api/datamarts", tags=["Data Marts"])
app.include_router(rls_router)
app.include_router(audit_router)
app.include_router(openmetadata_router)
