import os
import json
import logging
import asyncio

# Ensure local libs directory is in LD_LIBRARY_PATH for Playwright dependencies
local_libs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'libs', 'usr', 'lib', 'x86_64-linux-gnu'))
if os.path.isdir(local_libs_path):
    existing_ld = os.environ.get("LD_LIBRARY_PATH", "")
    if existing_ld:
        os.environ["LD_LIBRARY_PATH"] = f"{local_libs_path}:{existing_ld}"
    else:
        os.environ["LD_LIBRARY_PATH"] = local_libs_path

from playwright.async_api import async_playwright
from app.config import settings
from app.auth.security import create_access_token
from app.models import User

logger = logging.getLogger(__name__)

async def take_dashboard_screenshot(dashboard_id: int, user: User) -> bytes:
    return await take_snapshot("dashboard", dashboard_id, user)

async def take_snapshot(target_type: str, target_id: int, user: User) -> bytes:
    """
    Generate a high-DPI full-page PNG screenshot of a dashboard or chart using Playwright.
    Securely bypasses login by injecting a JWT token directly into the browser's localStorage.
    """
    # 1. Generate secure JWT token for the user
    token = create_access_token(subject=str(user.id))
    
    # 2. Extract roles and permissions
    roles = []
    permissions = []
    if user.groups:
        for group in user.groups:
            for role in group.roles:
                roles.append(role.name)
                for perm in role.permissions:
                    permissions.append(perm.name)
                    
    # Unique lists
    roles = list(set(roles))
    permissions = list(set(permissions))

    # Serialize user info to match Zustand auth-storage
    user_data = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "roles": roles,
        "permissions": permissions,
    }
    
    auth_state = {
        "state": {
            "token": token,
            "user": user_data
        },
        "version": 0
    }
    
    # 3. Construct paths
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    login_url = f"{frontend_url}/login"
    
    if target_type == "chart":
        target_url = f"{frontend_url}/charts/{target_id}"
    else:
        target_url = f"{frontend_url}/dashboards/{target_id}"
    
    logger.info(f"Taking screenshot of {target_type} {target_id} on behalf of user {user.email}")
    
    async with async_playwright() as p:
        # Launch headless Chromium. Disable sandbox for Docker/restricted container safety.
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        
        # Create context with standard screen size (1440x1000) and 2x device scale for high definition
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1000},
            device_scale_factor=2
        )
        
        page = await context.new_page()
        
        try:
            # First, visit login page to establish origin domain context in Playwright
            logger.info(f"Navigating to login URL: {login_url}")
            await page.goto(login_url, wait_until="networkidle")
            
            # Inject auth-storage into localStorage
            auth_str = json.dumps(auth_state)
            # Escape single quotes in JSON string to avoid JS evaluation syntax errors
            escaped_auth_str = auth_str.replace("'", "\\'")
            await page.evaluate(f"localStorage.setItem('auth-storage', '{escaped_auth_str}')")
            logger.info("Successfully injected auth-storage token into localStorage.")
            
            # Now, navigate directly to target
            logger.info(f"Navigating to target URL: {target_url}")
            await page.goto(target_url, wait_until="networkidle")
            
            # Allow charts, data, and layout grids to render fully
            await page.wait_for_timeout(5000)
            
            if target_type == "chart":
                # Inject JS to expand chart and hide builder panels
                await page.evaluate("""
                    () => {
                        // Hide top bar
                        const topBar = document.querySelector('div.shrink-0.bg-white.dark\\\\:bg-slate-900.border-b') || 
                                       document.querySelector('.shrink-0.bg-white.dark\\\\:bg-slate-900.border-b');
                        if (topBar) topBar.style.display = 'none';

                        // Hide left-most sidebar (Standard Charts)
                        const chartTypesSidebar = document.querySelector('div.shrink-0.w-44') ||
                                                  document.querySelector('.shrink-0.w-44');
                        if (chartTypesSidebar) chartTypesSidebar.style.display = 'none';

                        // Hide left sidebar (Data Selection / Schema)
                        const sidebars = document.querySelectorAll('div.shrink-0.flex.flex-col');
                        sidebars.forEach(sidebar => {
                            if (sidebar.style.width || sidebar.className.includes('bg-slate-50')) {
                                sidebar.style.display = 'none';
                            }
                        });

                        // Make content flex containers fill screen
                        const mainWrapper = document.querySelector('div.flex-1.flex.min-h-0');
                        if (mainWrapper) {
                            mainWrapper.style.height = '100vh';
                            mainWrapper.style.width = '100vw';
                            mainWrapper.style.padding = '0';
                            mainWrapper.style.margin = '0';
                        }

                        // Expand preview container
                        const previewContainers = document.querySelectorAll('div.flex-1.flex.flex-col.min-h-0');
                        previewContainers.forEach(pc => {
                            pc.style.height = '100vh';
                            pc.style.width = '100vw';
                            pc.style.padding = '24px';
                            pc.style.margin = '0';
                        });
                    }
                """)
            else:
                # Execute JS script to clean up layout: remove the top navigation bar, 
                # and modify overflow properties so the page expands to fit all vertical widgets.
                await page.evaluate("""
                    () => {
                        // Remove top navigation bar and sidebar elements if present
                        document.querySelector('header')?.remove();
                        document.querySelector('aside')?.remove();
                        
                        // Reset scrollbars and make parent containers auto-height
                        const mainElement = document.querySelector('main');
                        if (mainElement) {
                            mainElement.style.overflow = 'visible';
                            mainElement.style.height = 'auto';
                        }
                        
                        const dashboardRoot = document.querySelector('div.flex.flex-col.h-full.bg-slate-50.font-sans');
                        if (dashboardRoot) {
                            dashboardRoot.style.height = 'auto';
                            dashboardRoot.style.overflow = 'visible';
                        }
                        
                        const flexColContainers = document.querySelectorAll('.flex-1.flex.flex-col');
                        flexColContainers.forEach(container => {
                            container.style.height = 'auto';
                            container.style.overflow = 'visible';
                        });
                    }
                """)
            
            # Take full page screenshot of the expanded dashboard or chart
            logger.info(f"Capturing {target_type} screenshot...")
            screenshot_bytes = await page.screenshot(full_page=True)
            return screenshot_bytes
            
        except Exception as e:
            logger.error(f"Error occurred during {target_type} screenshot: {e}")
            raise e
        finally:
            await context.close()
            await browser.close()
