import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.core.worker import server_worker

import os

logger = logging.getLogger(__name__)

ALLOWED_ORIGIN_REGEX = re.compile(
    r"^(https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?|capacitor://localhost|https://([a-zA-Z0-9-]+\.)*susindran\.in|https://([a-zA-Z0-9-]+\.)*vercel\.app)$",
    re.IGNORECASE,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing %s (env=%s)...", settings.app_name, settings.app_env)
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

    @application.middleware("http")
    async def global_cors_and_error_middleware(request: Request, call_next):
        origin = request.headers.get("origin")
        allowed_origins = settings.cors_origins

        is_allowed = bool(
            origin
            and (
                "*" in allowed_origins
                or origin in allowed_origins
                or ALLOWED_ORIGIN_REGEX.match(origin)
            )
        )

        if request.method == "OPTIONS":
            response = JSONResponse(status_code=204, content=None)
        else:
            try:
                response = await call_next(request)
            except (FastAPIHTTPException, StarletteHTTPException) as exc:
                response = JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=getattr(exc, "headers", None) or {},
                )
            except RequestValidationError as exc:
                response = JSONResponse(
                    status_code=422,
                    content={"detail": exc.errors()},
                )
            except Exception as exc:
                logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
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
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            req_headers = request.headers.get("access-control-request-headers")
            response.headers["Access-Control-Allow-Headers"] = (
                req_headers or "Authorization, Content-Type, Accept, Origin, X-Requested-With, CRON-Secret, *"
            )
            response.headers["Access-Control-Max-Age"] = "86400"

        return response

    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
        response = JSONResponse(
            status_code=500,
            content={"detail": str(exc) if settings.app_env == "development" else "An internal server error occurred."},
        )
        origin = request.headers.get("origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    application.include_router(api_router, prefix=settings.api_v1_prefix)

    return application


app = create_app()
