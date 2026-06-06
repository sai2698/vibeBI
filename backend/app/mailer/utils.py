import aiosmtplib
from email.message import EmailMessage
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def send_email(recipients: list, subject: str, body: str, html: bool = False):
    """
    Send an email asynchronously using SMTP.
    """
    message = EmailMessage()
    message["From"] = settings.FROM_EMAIL
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    
    if html:
        message.set_content(body, subtype="html")
    else:
        message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_PORT == 465,
            start_tls=settings.SMTP_PORT == 587,
        )
        logger.info(f"Email sent to {recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise e
