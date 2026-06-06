from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.database import get_db
from app.models import RefreshSchedule, EmailReport, User
from app.schemas import (
    ScheduleCreate, ScheduleResponse, 
    EmailReportCreate, EmailReportResponse
)
from app.auth.dependencies import get_current_active_user
from app.scheduler.manager import add_report_job, remove_report_job, execute_report_task

router = APIRouter(prefix="/api/schedules", tags=["scheduler"])

# --- Schedules ---

@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    sched_in: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_schedule = RefreshSchedule(
        name=sched_in.name,
        target_type=sched_in.target_type,
        target_id=sched_in.target_id,
        cron_expression=sched_in.cron_expression,
        timezone=sched_in.timezone or "UTC",
        is_active=sched_in.is_active,
        created_by=current_user.id
    )
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule

@router.get("/", response_model=List[ScheduleResponse])
async def read_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(RefreshSchedule).where(RefreshSchedule.created_by == current_user.id))
    return result.scalars().all()

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(RefreshSchedule).where(RefreshSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Also remove associated report jobs
    report_result = await db.execute(select(EmailReport).where(EmailReport.schedule_id == schedule_id))
    reports = report_result.scalars().all()
    for r in reports:
        remove_report_job(r.id)
        
    await db.delete(schedule)
    await db.commit()
    return None

# --- Email Reports ---

@router.post("/reports", response_model=EmailReportResponse, status_code=status.HTTP_201_CREATED)
async def create_email_report(
    report_in: EmailReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify schedule exists
    res = await db.execute(select(RefreshSchedule).where(RefreshSchedule.id == report_in.schedule_id))
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Associated schedule not found")

    db_report = EmailReport(
        name=report_in.name,
        schedule_id=report_in.schedule_id,
        recipients=report_in.recipients,
        subject_template=report_in.subject_template,
        body_template=report_in.body_template,
        include_charts=getattr(report_in, 'include_charts', []),
        attachments=getattr(report_in, 'attachments', {})
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)

    # If schedule is active, register job
    if schedule.is_active:
        add_report_job(db_report.id, schedule.cron_expression, schedule.timezone)

    return db_report

@router.get("/reports", response_model=List[EmailReportResponse])
async def read_email_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Join with RefreshSchedule to filter by created_by
    result = await db.execute(
        select(EmailReport)
        .join(RefreshSchedule)
        .where(RefreshSchedule.created_by == current_user.id)
    )
    return result.scalars().all()

@router.post("/{schedule_id}/run")
async def run_schedule_now(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Manually trigger all reports for a schedule."""
    # Find all reports for this schedule
    result = await db.execute(select(EmailReport).where(EmailReport.schedule_id == schedule_id))
    reports = result.scalars().all()
    
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this schedule")
        
    for report in reports:
        await execute_report_task(report.id)
        
    return {"message": f"Triggered {len(reports)} report tasks"}

@router.get("/logs")
async def read_job_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models import JobLog
    result = await db.execute(
        select(JobLog)
        .where(JobLog.created_by == current_user.id)
        .order_by(JobLog.run_at.desc())
        .limit(100)
    )
    return result.scalars().all()
