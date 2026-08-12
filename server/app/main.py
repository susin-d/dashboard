import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc) if settings.app_env == "development" else "An internal server error occurred."},
        )

    application.include_router(api_router, prefix=settings.api_v1_prefix)

    return application


app = create_app()


