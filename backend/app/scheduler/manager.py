from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Configure Job Store (Sync URL for APScheduler)
sync_db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

job_stores = {
    'default': SQLAlchemyJobStore(url=sync_db_url)
}

scheduler = AsyncIOScheduler(jobstores=job_stores)

async def execute_audit_cleanup_task():
    from app.database import AsyncSessionLocal
    from app.models import AuditLog, SystemSetting
    from sqlalchemy.future import select
    from sqlalchemy import delete
    from datetime import datetime, timedelta
    
    logger.info("Running Audit Log cleanup task...")
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == "audit_log_retention_days"))
        setting = res.scalar_one_or_none()
        
        try:
            retention_days = int(setting.value) if setting and setting.value else 30
        except ValueError:
            retention_days = 30
            
        # Use simple tz-naive datetime for Postgres timestamp comparison if needed, or tz-aware
        from datetime import timezone
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        result = await db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff_date))
        await db.commit()
        
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} audit logs older than {retention_days} days.")


async def execute_report_task(report_id: int):
    """
    Background task to execute an email report with audit logging.
    """
    from app.database import AsyncSessionLocal
    from app.models import EmailReport, RefreshSchedule, JobLog
    from sqlalchemy.future import select
    from datetime import datetime
    import time
    
    start_time = time.time()
    logger.info(f"Executing scheduled report task for ID: {report_id}")
    
    async with AsyncSessionLocal() as db:
        # Fetch report and schedule first to get owner_id
        res = await db.execute(select(EmailReport).where(EmailReport.id == report_id))
        report = res.scalar_one_or_none()
        if not report:
            logger.error(f"Report {report_id} not found")
            return
            
        res = await db.execute(select(RefreshSchedule).where(RefreshSchedule.id == report.schedule_id))
        schedule = res.scalar_one_or_none()
        owner_id = schedule.created_by if schedule else None

        # Create initial log entry with owner_id
        log = JobLog(
            job_id=f"report_{report_id}",
            task_name=f"Report Execution: {report.name}",
            status="RUNNING",
            run_at=datetime.now(),
            created_by=owner_id
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)

        try:
            if schedule:
                schedule.last_run_at = datetime.now()
                schedule.last_run_status = "SUCCESS"

            # 3. Actual email sending
            from app.mailer.utils import send_email
            recipient_list = report.recipients.get("emails", [])
            
            if not recipient_list:
                raise ValueError("No recipients defined for this report")

            await send_email(
                recipients=recipient_list,
                subject=report.subject_template,
                body=report.body_template,
                html=True
            )
            
            log.status = "SUCCESS"
            log.message = f"Report '{report.name}' sent successfully to {len(recipient_list)} recipients"
            
        except Exception as e:
            log.status = "FAILURE"
            log.message = str(e)
            logger.error(f"Task failed: {e}")
        
        finally:
            log.finished_at = datetime.now()
            log.execution_time_ms = int((time.time() - start_time) * 1000)
            await db.commit()

def start_scheduler():
    if not scheduler.running:
        job_id = "audit_log_cleanup"
        if not scheduler.get_job(job_id):
            scheduler.add_job(
                execute_audit_cleanup_task,
                CronTrigger.from_crontab("0 2 * * *", timezone="UTC"),
                id=job_id,
                replace_existing=True
            )
        
        scheduler.start()
        logger.info("Scheduler started")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")

def add_report_job(report_id: int, cron_expr: str, timezone: str = "UTC"):
    job_id = f"report_{report_id}"
    # Remove existing if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        
    scheduler.add_job(
        execute_report_task,
        CronTrigger.from_crontab(cron_expr, timezone=timezone),
        id=job_id,
        args=[report_id],
        replace_existing=True
    )
    logger.info(f"Added job {job_id} with cron {cron_expr}")

def remove_report_job(report_id: int):
    job_id = f"report_{report_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Removed job {job_id}")
