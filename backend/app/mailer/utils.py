import aiosmtplib
from email.message import EmailMessage
from app.config import settings
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)

def convert_png_to_pdf(png_bytes: bytes) -> bytes:
    """
    Convert raw PNG bytes into a standard PDF byte stream.
    """
    try:
        image = Image.open(io.BytesIO(png_bytes))
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        pdf_buffer = io.BytesIO()
        image.save(pdf_buffer, format='PDF')
        return pdf_buffer.getvalue()
    except Exception as e:
        logger.error(f"Failed to convert PNG to PDF: {e}")
        return png_bytes  # fallback to returning original bytes if conversion fails

async def send_email(
    recipients: list,
    subject: str,
    body: str,
    html: bool = False,
    attachments: list = None,
    inline_images: list = None
):
    """
    Send an email asynchronously using SMTP, with optional inline images and file attachments.
    """
    message = EmailMessage()
    message["From"] = settings.FROM_EMAIL
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    
    if html:
        message.set_content(body, subtype="html")
    else:
        message.set_content(body)

    # Add inline images
    if inline_images:
        for img in inline_images:
            cid = img["cid"]
            content = img["content"]
            mime_type = img.get("mime_type", "image/png")
            maintype, subtype = mime_type.split("/", 1)
            message.add_attachment(
                content,
                maintype=maintype,
                subtype=subtype,
                cid=f"<{cid}>",
                filename=img.get("filename", f"{cid}.png")
            )

    # Add file attachments
    if attachments:
        for att in attachments:
            content = att["content"]
            filename = att["filename"]
            mime_type = att.get("mime_type", "application/octet-stream")
            maintype, subtype = mime_type.split("/", 1)
            message.add_attachment(
                content,
                maintype=maintype,
                subtype=subtype,
                filename=filename
            )

    smtp_kwargs = {
        "hostname": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
    }
    if settings.SMTP_PORT == 465:
        smtp_kwargs["use_tls"] = True
    elif settings.SMTP_PORT == 587:
        smtp_kwargs["start_tls"] = True

    is_localhost = settings.SMTP_HOST in ("localhost", "127.0.0.1", "0.0.0.0")
    has_valid_auth = settings.SMTP_USER and settings.SMTP_PASSWORD and settings.SMTP_PASSWORD != "changeme"

    if has_valid_auth and not (is_localhost and settings.SMTP_PORT == 1025):
        smtp_kwargs["username"] = settings.SMTP_USER
        smtp_kwargs["password"] = settings.SMTP_PASSWORD

    try:
        await aiosmtplib.send(message, **smtp_kwargs)
        logger.info(f"Email sent to {recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise e
