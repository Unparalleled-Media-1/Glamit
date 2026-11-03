"""Redacted request evidence; no headers, query strings, bodies or private IDs in logs."""

import json
import logging
from time import perf_counter
from uuid import UUID, uuid4

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("glam.requests")


async def request_evidence(request: Request, call_next):
    supplied = request.headers.get("X-Request-ID", "")
    try:
        request_id = str(UUID(supplied))
    except ValueError:
        request_id = str(uuid4())
    request.state.request_id = request_id
    started = perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    finally:
        route = request.scope.get("route")
        logger.info(
            json.dumps(
                {
                    "request_id": request_id,
                    "method": request.method,
                    "route": getattr(route, "path", "unmatched"),
                    "status": status,
                    "duration_ms": round((perf_counter() - started) * 1000, 2),
                }
            )
        )


async def http_error(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "code": f"HTTP_{exc.status_code}",
            "message": exc.detail,
            "request_id": request.state.request_id,
            "retryable": exc.status_code in (429, 503),
        },
    )


async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "request_id": request.state.request_id,
            "retryable": False,
            "field_errors": [{"field": list(e["loc"]), "code": e["type"]} for e in exc.errors()],
        },
    )
