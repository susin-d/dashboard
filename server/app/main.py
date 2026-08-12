import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.worker import server_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing %s (env=%s)...", settings.app_name, settings.app_env)
    # Start long-running server background worker daemon
    try:
        server_worker.start()
    except Exception as err:
        logger.warning("Could not start background worker daemon: %s", err)
    yield
    logger.info("Shutting down %s...", settings.app_name)
    try:
        server_worker.stop()
    except Exception as err:
        logger.warning("Error stopping background worker daemon: %s", err)


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
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



