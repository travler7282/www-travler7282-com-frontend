import time
from fastapi import Request, HTTPException
from config import config

# Store the request timestamps per client IP.
requests_log = {}

RATE_LIMIT = config["rate_limit"]["requests"]
WINDOW_SECONDS = config["rate_limit"]["window_seconds"]
ENABLED = config["rate_limit"]["enabled"]


def get_client_ip(request: Request):
    # Trust FastAPI/Uvicorn's resolved client address instead of raw headers.
    if request.client and request.client.host:
        return request.client.host

    # Final fallback
    return "unknown"


def rate_limit(request: Request):
    if not ENABLED:
        return
    
    client_ip = get_client_ip(request)
    now = time.time()

    if client_ip not in requests_log:
        requests_log[client_ip] = []

    # Cleanup old timestamp entries
    requests_log[client_ip] = [
        t for t in requests_log[client_ip]
        if now - t < WINDOW_SECONDS
    ]

    if len(requests_log[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    requests_log[client_ip].append(now)

