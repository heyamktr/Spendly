from fastapi import APIRouter

from app.api.routes.analytics import router as analytics_router
from app.api.routes.expenses import router as expenses_router
from app.api.routes.health import router as health_router
from app.api.routes.users import router as users_router
from app.api.routes.webhook import router as webhook_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(users_router)
api_router.include_router(expenses_router)
api_router.include_router(analytics_router)
api_router.include_router(webhook_router)
