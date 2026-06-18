from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import EmailReport, User, Dashboard
from app.schemas import EmailReportCreate, EmailReportResponse
from app.auth.dependencies import get_current_active_user
from app.config import settings

router = APIRouter(prefix="/api/mailer", tags=["mailer"])

class MailSendRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    target_type: Optional[str] = "dashboard"  # "dashboard", "chart", or "none"
    target_id: Optional[int] = None
    dashboard_id: Optional[int] = None  # for backward compatibility
    include_snapshot: Optional[bool] = True
    attach_data_format: Optional[str] = None  # "csv", "xlsx", or None

def build_html_email(title: str, url: str, body_text: str, has_snapshot: bool, target_type: str) -> str:
    inline_image_section = ""
    if has_snapshot:
        inline_image_section = f"""
        <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left;">
                <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">{target_type.capitalize()} Preview</span>
            </div>
            <div style="padding: 0; background-color: #ffffff; text-align: center;">
                <img src="cid:snapshot_preview" alt="Preview Snapshot" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
            </div>
        </div>
        """

    target_type_label = "Dashboard" if target_type == "dashboard" else "Chart"
    cta_label = f"Explore Interactive {target_type_label}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }}
        </style>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; padding-top: 24px; padding-bottom: 24px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
            <!-- Header with subtle gradient -->
            <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px;">
                        <span style="color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">VibeBI Enterprise Report</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">{title}</h1>
                </td>
            </tr>
            
            <!-- Content Area -->
            <tr>
                <td style="padding: 32px; color: #1e293b; text-align: left;">
                    <!-- Message Body -->
                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 24px; white-space: pre-wrap;">{body_text}</p>
                    
                    <!-- Dashboard Snapshot Section -->
                    {inline_image_section}
                    
                    <!-- Call to Action Button -->
                    <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
                        <a href="{url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);">
                            {cta_label}
                        </a>
                    </div>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">
                        This report was generated automatically by VibeBI.
                    </p>
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 6px; margin-bottom: 0;">
                        Confidential. For internal use only.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html

import pandas as pd
import io
import logging

logger = logging.getLogger(__name__)

async def get_chart_data_dataframe(chart_id: int, db: AsyncSession, user: User) -> pd.DataFrame:
    from app.charts.router import get_chart_data
    from app.schemas import ChartDataRequest
    try:
        req = ChartDataRequest(chart_id=chart_id)
        res = await get_chart_data(chart_id=chart_id, req=req, db=db, current_user=user)
        data = res.get("data", [])
        if not data:
            cols = res.get("columns", [])
            return pd.DataFrame(columns=cols)
        return pd.DataFrame(data)
    except Exception as e:
        logger.error(f"Failed to fetch data for chart {chart_id}: {e}")
        return pd.DataFrame()

@router.post("/send")
async def send_report_campaign(
    payload: MailSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Directly send a beautifully-formatted BI email report with inline dashboard/chart snapshots and optional attachments.
    """
    from app.models import Chart
    from app.mailer.screenshot import take_snapshot
    from app.mailer.utils import convert_png_to_pdf
    
    t_type = payload.target_type
    t_id = payload.target_id
    if payload.dashboard_id and not t_id:
        t_type = "dashboard"
        t_id = payload.dashboard_id
        
    report_title = "BI Custom Report"
    attachments = []
    inline_images = []
    
    # Resolve simple tokens in subject line
    subject = payload.subject
    date_str = datetime.now().strftime("%Y-%m-%d")
    subject = subject.replace("{{date}}", date_str).replace("{{report_date}}", date_str)
    
    # Reload current_user with groups/roles/permissions relationships loaded
    from sqlalchemy.orm import selectinload
    from app.models import Group, Role
    user_res = await db.execute(
        select(User)
        .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
        .where(User.id == current_user.id)
    )
    full_user = user_res.scalar_one_or_none() or current_user

    # List of charts to export data from
    export_charts = []
    
    if t_type == "dashboard" and t_id:
        res = await db.execute(select(Dashboard).where(Dashboard.id == t_id))
        dashboard = res.scalar_one_or_none()
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        report_title = dashboard.title
        
        # Collect charts from dashboard layout and/or pages
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
                    
    elif t_type == "chart" and t_id:
        res = await db.execute(select(Chart).where(Chart.id == t_id))
        chart = res.scalar_one_or_none()
        if not chart:
            raise HTTPException(status_code=404, detail="Chart not found")
        report_title = chart.title
        export_charts.append(chart)
        
    # Take Snapshot if requested and target exists
    if payload.include_snapshot and t_type != "none" and t_id:
        try:
            screenshot_bytes = await take_snapshot(t_type, t_id, full_user)
            
            # Add inline image
            inline_images.append({
                "cid": "snapshot_preview",
                "content": screenshot_bytes,
                "mime_type": "image/png",
                "filename": f"{t_type}_{t_id}.png"
            })
            
            # Add PDF attachment
            pdf_bytes = convert_png_to_pdf(screenshot_bytes)
            attachments.append({
                "filename": f"{t_type}_{t_id}.pdf",
                "content": pdf_bytes,
                "mime_type": "application/pdf"
            })
        except Exception as e:
            logger.error(f"Failed to generate {t_type} screenshot: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate {t_type} screenshot: {str(e)}"
            )

    # Attach raw data if requested
    if payload.attach_data_format and export_charts:
        if payload.attach_data_format == "csv":
            for chart_obj in export_charts:
                df = await get_chart_data_dataframe(chart_obj.id, db, full_user)
                if not df.empty:
                    csv_str = df.to_csv(index=False)
                    safe_title = "".join(c for c in chart_obj.title if c.isalnum() or c in (" ", "_", "-")).rstrip()
                    safe_title = safe_title.replace(" ", "_")
                    attachments.append({
                        "filename": f"{safe_title}_data.csv",
                        "content": csv_str.encode("utf-8"),
                        "mime_type": "text/csv"
                    })
        elif payload.attach_data_format == "xlsx":
            xlsx_buffer = io.BytesIO()
            has_data = False
            with pd.ExcelWriter(xlsx_buffer, engine='openpyxl') as writer:
                for chart_obj in export_charts:
                    df = await get_chart_data_dataframe(chart_obj.id, db, full_user)
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
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    if t_type == "dashboard" and t_id:
        target_url = f"{frontend_url}/dashboards/{t_id}"
    elif t_type == "chart" and t_id:
        target_url = f"{frontend_url}/charts/{t_id}"
    else:
        target_url = frontend_url
        
    html_body = build_html_email(
        title=report_title,
        url=target_url,
        body_text=payload.body,
        has_snapshot=len(inline_images) > 0,
        target_type=t_type
    )
    
    # Send email
    from app.mailer.utils import send_email
    try:
        await send_email(
            recipients=payload.to,
            subject=subject,
            body=html_body,
            html=True,
            attachments=attachments if attachments else None,
            inline_images=inline_images if inline_images else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )
        
    return {"status": "success", "message": f"Email successfully sent to {len(payload.to)} recipients"}

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
