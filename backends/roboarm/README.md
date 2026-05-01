# RoboArm Backend

Python 3.11+ FastAPI backend for BLE robotic arm control and camera streaming.

## What It Does
- Exposes BLE device scanning, connection, and command relay endpoints
- Streams camera frames as JPEG or SVG fallback
- Provides health and readiness endpoints
- WebSocket for terminal BLE communication

## Endpoints

All endpoints are available at both the root and under `/roboarm/api/v1`.

### GET /healthz
- Health check
- Response: `{ "status": "ok" }`

### GET /readyz
- Readiness check
- Response: `{ "status": "ready" }`

### GET /camera/frame, /camera/feed
- Returns a JPEG image from the camera, or SVG if unavailable
- Response: `image/jpeg` or `image/svg+xml`

### GET /scan
- Scans for nearby BLE devices named "Hiwonder"
- Response: `[ { "name": "Hiwonder", "address": "..." }, ... ]`

### WebSocket /ws/terminal
- BLE terminal communication (connect, send, receive)
- JSON message protocol

## Running Locally

```bash
python -m venv ../../.venv
../../.venv/Scripts/python.exe -m pip install -r requirements.txt
../../.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

## Unit Tests

```bash
../../.venv/Scripts/python.exe -m pytest tests
```

## Docker

```bash
docker build -t roboarm-backend .
docker run -p 8000:8000 roboarm-backend
```
