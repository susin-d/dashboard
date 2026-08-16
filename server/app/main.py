import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException as FastAPIHTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.api.routes.calls_ws import router as calls_ws_router
from app.api.routes.whatsapp_ws import router as whatsapp_ws_router
from app.core.config import settings
from app.core.worker import server_worker

from app.db.session import init_db

logger = logging.getLogger(__name__)

ALLOWED_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"
    r"|^capacitor://localhost$"
    r"|^https://([a-zA-Z0-9-]+\.)*susindran\.in$"
    r"|^https://([a-zA-Z0-9-]+\.)*vercel\.app$"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing %s (env=%s)...", settings.app_name, settings.app_env)
    try:
        await init_db()
    except Exception as err:
        logger.warning("Could not auto-init database tables: %s", err)
    # Only start background worker daemon in non-serverless environments
    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    if not is_serverless:
        try:
            server_worker.start()
        except Exception as err:
            logger.warning("Could not start background worker daemon: %s", err)
    yield
    logger.info("Shutting down %s...", settings.app_name)
    if not is_serverless:
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

    # Standard ASGI CORS Middleware (pure ASGI handler for preflight and standard requests)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=ALLOWED_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=86400,
    )

    @application.exception_handler(FastAPIHTTPException)
    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        origin = request.headers.get("origin")
        response = JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None) or {},
        )
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        origin = request.headers.get("origin")
        response = JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
        origin = request.headers.get("origin")
        response = JSONResponse(
            status_code=500,
            content={
                "detail": str(exc)
                if settings.app_env == "development"
                else "An internal server error occurred."
            },
        )
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    application.include_router(api_router, prefix=settings.api_v1_prefix)
    # WebSocket endpoints mount at root path (/ws/calls, /ws/whatsapp)
    application.include_router(calls_ws_router)
    application.include_router(whatsapp_ws_router)

    return application


app = create_app()
