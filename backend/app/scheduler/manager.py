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
        
        # Load owner user details with role/permission relationships
        owner_user = None
        if owner_id:
            from sqlalchemy.orm import selectinload
            from app.models import User, Group, Role
            user_res = await db.execute(
                select(User)
                .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
                .where(User.id == owner_id)
            )
            owner_user = user_res.scalar_one_or_none()

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
            from app.mailer.utils import send_email, convert_png_to_pdf
            from app.mailer.router import build_html_email
            from app.models import Dashboard
            
            recipient_list = report.recipients.get("emails", [])
            
            if not recipient_list:
                raise ValueError("No recipients defined for this report")

            target_type = schedule.target_type if schedule else "dashboard"
            target_id = schedule.target_id if schedule else None
            
            report_title = "BI Custom Report"
            attachments = []
            inline_images = []
            
            # Resolve simple tokens in subject line
            subject = report.subject_template
            date_str = datetime.now().strftime("%Y-%m-%d")
            subject = subject.replace("{{date}}", date_str).replace("{{report_date}}", date_str)

            from app.models import Chart
            from app.mailer.screenshot import take_snapshot
            from app.mailer.router import get_chart_data_dataframe
            import pandas as pd
            import io

            export_charts = []

            if target_type == "dashboard" and target_id and owner_user:
                # Get dashboard info
                dash_res = await db.execute(select(Dashboard).where(Dashboard.id == target_id))
                dashboard = dash_res.scalar_one_or_none()
                if dashboard:
                    report_title = dashboard.title
                    chart_ids = []
                    if dashboard.layout:
                        chart_ids.extend([item.get("chart_id") for item in dashboard.layout if item.get("chart_id")])
                    if dashboard.enable_pages and dashboard.pages:
                        for page in dashboard.pages:
                            page_layout = page.get("layout", []) if isinstance(page, dict) else getattr(page, "layout", [])
                            if page_layout:
                                chart_ids.extend([item.get("chart_id") for item in page_layout if item.get("chart_id")])
                    # Deduplicate
                    chart_ids = list(set(chart_ids))
                    for cid in chart_ids:
                        chart_res = await db.execute(select(Chart).where(Chart.id == cid))
                        chart_obj = chart_res.scalar_one_or_none()
                        if chart_obj:
                            export_charts.append(chart_obj)
            
            elif target_type == "chart" and target_id and owner_user:
                # Get chart info
                chart_res = await db.execute(select(Chart).where(Chart.id == target_id))
                chart = chart_res.scalar_one_or_none()
                if chart:
                    report_title = chart.title
                    export_charts.append(chart)

            if target_id and owner_user:
                try:
                    logger.info(f"Generating screenshot for scheduled report {report.name} ({target_type} {target_id})")
                    screenshot_bytes = await take_snapshot(target_type, target_id, owner_user)
                    
                    # Add inline snapshot preview
                    inline_images.append({
                        "cid": "snapshot_preview",
                        "content": screenshot_bytes,
                        "mime_type": "image/png",
                        "filename": f"{target_type}_{target_id}.png"
                    })
                    
                    # Add PDF attachment
                    pdf_bytes = convert_png_to_pdf(screenshot_bytes)
                    attachments.append({
                        "filename": f"{target_type}_{target_id}.pdf",
                        "content": pdf_bytes,
                        "mime_type": "application/pdf"
                    })
                except Exception as screenshot_err:
                    logger.error(f"Failed to generate screenshot for schedule: {screenshot_err}")
                    raise screenshot_err

            # Attach raw data if specified in report configuration
            attach_data_format = report.attachments.get("format") if (report.attachments and isinstance(report.attachments, dict)) else None
            if attach_data_format and export_charts:
                if attach_data_format == "csv":
                    for chart_obj in export_charts:
                        df = await get_chart_data_dataframe(chart_obj.id, db, owner_user)
                        if not df.empty:
                            csv_str = df.to_csv(index=False)
                            safe_title = "".join(c for c in chart_obj.title if c.isalnum() or c in (" ", "_", "-")).rstrip().replace(" ", "_")
                            attachments.append({
                                "filename": f"{safe_title}_data.csv",
                                "content": csv_str.encode("utf-8"),
                                "mime_type": "text/csv"
                            })
                elif attach_data_format == "xlsx":
                    xlsx_buffer = io.BytesIO()
                    has_data = False
                    with pd.ExcelWriter(xlsx_buffer, engine='openpyxl') as writer:
                        for chart_obj in export_charts:
                            df = await get_chart_data_dataframe(chart_obj.id, db, owner_user)
                            if not df.empty:
                                has_data = True
                                sheet_title = "".join(c for c in chart_obj.title if c.isalnum() or c in (" ", "_", "-")).rstrip()
                                sheet_title = sheet_title[:30].replace("[", "").replace("]", "").replace("?", "").replace("*", "").replace(":", "").replace("/", "").replace("\\", "")
                                if not sheet_title:
                                    sheet_title = f"Chart_{chart_obj.id}"
                                df.to_excel(writer, sheet_name=sheet_title, index=False)
                    if has_data:
                        safe_report_title = "".join(c for c in report_title if c.isalnum() or c in (" ", "_", "-")).rstrip().replace(" ", "_")
                        attachments.append({
                            "filename": f"{safe_report_title}_data.xlsx",
                            "content": xlsx_buffer.getvalue(),
                            "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        })

            # Build premium HTML template
            from app.config import settings
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            if target_type == "dashboard" and target_id:
                target_url = f"{frontend_url}/dashboards/{target_id}"
            elif target_type == "chart" and target_id:
                target_url = f"{frontend_url}/charts/{target_id}"
            else:
                target_url = frontend_url
            
            html_body = build_html_email(
                title=report_title,
                url=target_url,
                body_text=report.body_template,
                has_snapshot=len(inline_images) > 0,
                target_type=target_type
            )

            await send_email(
                recipients=recipient_list,
                subject=subject,
                body=html_body,
                html=True,
                attachments=attachments if attachments else None,
                inline_images=inline_images if inline_images else None
            )
            
            log.status = "SUCCESS"
            log.message = f"Report '{report.name}' sent successfully to {len(recipient_list)} recipients"
            
        except Exception as e:
            if schedule:
                schedule.last_run_status = "FAILURE"
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
