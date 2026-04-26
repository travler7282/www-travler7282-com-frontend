import os
from fastapi import Header, HTTPException
from config import config

def verify_api_key(x_api_key: str = Header(None)):
    if not config["security"]["require_api_key"]:
        return True

    app_api_key = os.getenv("APP_API_KEY")

    if not app_api_key:
        raise HTTPException(status_code=500, detail="Server not configured with API key")

    if not x_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized: API key missing")

    if x_api_key != app_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return True