# WXStation Backend

Python 3.11+ FastAPI backend for weather monitoring and aggregation.

## What It Does
- Provides local sensor and mock NWS weather data
- Health and readiness endpoints for monitoring
- Used as a backend for the WXStation frontend app

## Endpoints

All endpoints are available under `/wxstation/api/v1`.

### GET /wxstation/api/v1/healthz
- Health check
- Response: `{ "status": "ok" }`

### GET /wxstation/api/v1/readyz
- Readiness check
- Response: `{ "status": "ready" }`

### GET /wxstation/api/v1/conditions/local
- Returns current local sensor readings (mocked)
- Response: JSON object with temperature, humidity, etc.

### GET /wxstation/api/v1/conditions/nws
- Returns latest mock NWS forecast
- Response: JSON object with forecast details

### GET /wxstation/api/v1/conditions
- Returns combined local and NWS data
- Response: JSON object with both local and NWS fields

## Running Locally

```bash
python -m venv ../../.venv
../../.venv/Scripts/python.exe -m pip install -r requirements.txt
../../.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8001
```

## Unit Tests

```bash
../../.venv/Scripts/python.exe -m pytest tests
```

## Docker

```bash
docker build -t wxstation-backend .
docker run -p 8001:8001 wxstation-backend
```
