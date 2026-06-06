from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import EmailReport, User
from app.schemas import EmailReportCreate, EmailReportResponse
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/api/email-reports", tags=["mailer"])

@router.post("/", response_model=EmailReportResponse, status_code=status.HTTP_201_CREATED)
async def create_email_report(
    report_in: EmailReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_report = EmailReport(
        name=report_in.name,
        schedule_id=report_in.schedule_id,
        recipients=report_in.recipients,
        subject_template=report_in.subject_template,
        body_template=report_in.body_template,
        is_active=report_in.is_active,
        created_by=current_user.id
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)
    return db_report

@router.get("/", response_model=list[EmailReportResponse])
async def read_email_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(EmailReport))
    return result.scalars().all()
