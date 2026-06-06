import json
import logging
from typing import Any, Optional
import redis.asyncio as redis
from .config import settings

logger = logging.getLogger(__name__)

# Initialize Redis client with timeouts for robustness
redis_client = redis.from_url(
    settings.REDIS_URL, 
    decode_responses=True,
    socket_timeout=2.0,
    socket_connect_timeout=2.0
)

async def get_cache(key: str) -> Optional[Any]:
    """Retrieve a value from Redis cache by key."""
    try:
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Redis get_cache error for key {key}: {e}")
    return None

async def set_cache(key: str, value: Any, ttl_sec: int) -> bool:
    """Set a value in Redis cache with an expiration time."""
    try:
        data_str = json.dumps(value)
        await redis_client.set(key, data_str, ex=ttl_sec)
        return True
    except Exception as e:
        logger.error(f"Redis set_cache error for key {key}: {e}")
        return False

async def delete_cache(key: str) -> bool:
    """Delete a specific key from Redis cache."""
    try:
        await redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Redis delete_cache error for key {key}: {e}")
        return False

async def clear_namespace(pattern: str) -> int:
    """
    Delete all keys matching a specific pattern.
    Warning: Uses SCAN which is safe, but be careful with broad patterns.
    Returns the number of keys deleted.
    """
    try:
        count = 0
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
            count += 1
        return count
    except Exception as e:
        logger.error(f"Redis clear_namespace error for pattern {pattern}: {e}")
        return 0
