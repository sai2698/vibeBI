from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import SystemSetting

async def is_audit_logging_enabled(db: AsyncSession) -> bool:
    """
    Checks the system settings to see if audit logging is enabled.
    Defaults to True if the setting is not found.
    """
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "audit_logging_enabled"))
    setting = res.scalar_one_or_none()
    
    if not setting:
        return True
        
    return setting.value.lower() == "true"
