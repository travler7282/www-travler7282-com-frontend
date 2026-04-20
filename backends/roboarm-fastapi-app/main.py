import asyncio
import logging
import os
import re
import threading
from datetime import datetime, timezone
from typing import Any, List, Optional

from bleak import BleakClient, BleakScanner
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

try:
    import cv2 as _cv2
    cv2: Any = _cv2
except Exception:  # pragma: no cover - runtime dependency availability
    cv2 = None

# Basic logging for BLE and WebSocket lifecycle events.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("roboarm-backend")

app = FastAPI(title="RoboArm BLE Controller")

cors_origins = [origin.strip() for origin in os.getenv("ROBOARM_CORS_ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
if not cors_origins:
    cors_origins = ["*"]

allow_credentials = "*" not in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

CAMERA_DEVICE = os.getenv("ROBOARM_CAMERA_DEVICE", "0")
CAMERA_WIDTH = int(os.getenv("ROBOARM_CAMERA_WIDTH", "1280"))
CAMERA_HEIGHT = int(os.getenv("ROBOARM_CAMERA_HEIGHT", "720"))
CAMERA_JPEG_QUALITY = int(os.getenv("ROBOARM_CAMERA_JPEG_QUALITY", "80"))

_camera_lock = threading.Lock()
_camera_capture: Any | None = None


class BLEDevice(BaseModel):
    name: str
    address: str


@app.get("/healthz")
@app.get("/roboarm/api/v1/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
@app.get("/roboarm/api/v1/readyz")
async def readyz() -> dict[str, str]:
    return {"status": "ready"}


async def _ws_send_json_safe(websocket: WebSocket, payload: dict[str, Any]) -> None:
    try:
        await websocket.send_json(payload)
    except Exception:
        logger.debug("Failed sending payload to websocket", exc_info=True)


def _format_hex_payload(data: bytes) -> str:
    hex_response = data.hex().upper()
    return " ".join(hex_response[i : i + 2] for i in range(0, len(hex_response), 2))


def _camera_svg(message: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return f"""<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#020617'/>
      <stop offset='100%' stop-color='#0f172a'/>
    </linearGradient>
  </defs>
  <rect width='1280' height='720' fill='url(#bg)'/>
  <rect x='22' y='22' width='1236' height='676' rx='14' fill='none' stroke='#334155' stroke-width='2'/>
  <line x1='640' y1='0' x2='640' y2='720' stroke='#1e293b' stroke-width='2'/>
  <line x1='0' y1='360' x2='1280' y2='360' stroke='#1e293b' stroke-width='2'/>
  <circle cx='640' cy='360' r='48' fill='none' stroke='#38bdf8' stroke-width='2' opacity='0.5'/>
  <text x='40' y='58' fill='#ef4444' font-family='monospace' font-size='24'>LIVE FEED</text>
  <text x='40' y='96' fill='#94a3b8' font-family='monospace' font-size='20'>Source: USB camera backend endpoint</text>
  <text x='40' y='132' fill='#93c5fd' font-family='monospace' font-size='20'>Timestamp: {now}</text>
  <text x='40' y='682' fill='#fca5a5' font-family='monospace' font-size='18'>{message}</text>
</svg>"""


def _camera_target() -> int | str:
    if CAMERA_DEVICE.isdigit():
        return int(CAMERA_DEVICE)

    # Normalize /dev/videoN paths to numeric index so OpenCV uses camera capture backends
    # instead of treating the path like a regular image/video filename.
    match = re.fullmatch(r"/dev/video(\d+)", CAMERA_DEVICE)
    if match:
        return int(match.group(1))

    return CAMERA_DEVICE


def _ensure_camera_open() -> tuple[bool, str]:
    global _camera_capture

    if cv2 is None:
        return False, "opencv not available in runtime"

    if _camera_capture is not None and _camera_capture.isOpened():
        return True, ""

    target = _camera_target()
    # Force V4L2 for Linux camera devices to avoid fallback decoder paths.
    if isinstance(target, int):
        capture = cv2.VideoCapture(target, cv2.CAP_V4L2)
    else:
        capture = cv2.VideoCapture(target)
    if not capture or not capture.isOpened():
        if capture:
            capture.release()
        return False, f"unable to open camera target {target}"

    capture.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
    _camera_capture = capture
    logger.info("Camera opened on target %s", target)
    return True, ""


def _read_camera_frame_jpeg() -> tuple[Optional[bytes], str]:
    global _camera_capture

    with _camera_lock:
        opened, error = _ensure_camera_open()
        if not opened:
            return None, error

        assert _camera_capture is not None
        ok, frame = _camera_capture.read()
        if not ok or frame is None:
            _camera_capture.release()
            _camera_capture = None
            reopened, error = _ensure_camera_open()
            if not reopened:
                return None, error
            assert _camera_capture is not None
            ok, frame = _camera_capture.read()
            if not ok or frame is None:
                return None, "camera opened but frame capture failed"

        encoded_ok, encoded = cv2.imencode(
            ".jpg",
            frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), CAMERA_JPEG_QUALITY],
        )
        if not encoded_ok:
            return None, "jpeg encoding failed"

        return encoded.tobytes(), ""


@app.on_event("shutdown")
def _release_camera() -> None:
    global _camera_capture
    with _camera_lock:
        if _camera_capture is not None:
            _camera_capture.release()
            _camera_capture = None
            logger.info("Camera released")


@app.get("/camera/frame")
@app.get("/camera/feed")
@app.get("/roboarm/api/v1/camera/frame")
@app.get("/roboarm/api/v1/camera/feed")
async def camera_frame() -> Response:
    jpeg, error = await asyncio.to_thread(_read_camera_frame_jpeg)
    if jpeg is not None:
        return Response(
            content=jpeg,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
        )

    svg = _camera_svg(f"Camera unavailable: {error}")
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/scan", response_model=List[BLEDevice])
@app.get("/roboarm/api/v1/scan", response_model=List[BLEDevice])
async def scan_devices() -> List[BLEDevice]:
    """Scan for nearby BLE devices reachable from this runtime."""
    try:
        devices = await BleakScanner.discover(timeout=5.0)
        return [
            BLEDevice(name=device.name, address=device.address)
            for device in devices
            if device.name == "Hiwonder"
        ]
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.websocket("/ws/terminal")
@app.websocket("/roboarm/api/v1/ws/terminal")
async def roboarm_ws_terminal(websocket: WebSocket) -> None:
    await websocket.accept()

    client: Optional[BleakClient] = None
    tx_handle: Optional[int] = None
    rx_handle: Optional[int] = None
    notify_enabled = False

    async def _disconnect_client() -> None:
        nonlocal notify_enabled
        if not client:
            return

        if client.is_connected and notify_enabled and rx_handle is not None:
            try:
                await client.stop_notify(rx_handle)
            except Exception:
                logger.debug("stop_notify failed during cleanup", exc_info=True)
            notify_enabled = False

        if client.is_connected:
            try:
                await client.disconnect()
            except Exception:
                logger.debug("BLE disconnect failed during cleanup", exc_info=True)

    def notification_handler(_: int, data: bytearray) -> None:
        asyncio.create_task(
            _ws_send_json_safe(
                websocket,
                {
                    "type": "rx_data",
                    "payload": _format_hex_payload(data),
                },
            )
        )

    try:
        while True:
            message = await websocket.receive_json()
            if not isinstance(message, dict):
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "message": "Invalid message format"},
                )
                continue

            action = message.get("action")
            if not isinstance(action, str):
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "message": "Missing or invalid action"},
                )
                continue

            if action == "connect":
                address = message.get("address")
                if not isinstance(address, str) or not address.strip():
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Missing or invalid BLE address"},
                    )
                    continue

                if client and client.is_connected:
                    await _disconnect_client()

                ble_client = BleakClient(address.strip())
                await ble_client.connect(timeout=10.0)
                client = ble_client
                logger.info("Connected to %s", address)

                services = await ble_client.get_services()
                services_data: list[dict[str, Any]] = []
                for service in services:
                    chars = [{"uuid": str(char.uuid), "handle": char.handle} for char in service.characteristics]
                    services_data.append({"uuid": service.uuid, "characteristics": chars})

                await _ws_send_json_safe(
                    websocket,
                    {
                        "type": "status",
                        "message": "Connected",
                        "services": services_data,
                    },
                )

            elif action == "select_io":
                next_tx_handle = message.get("tx_handle")
                next_rx_handle = message.get("rx_handle")

                if not isinstance(next_tx_handle, int):
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Missing or invalid tx_handle"},
                    )
                    continue

                if not isinstance(next_rx_handle, int):
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Missing or invalid rx_handle"},
                    )
                    continue

                if not client or not client.is_connected:
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Not connected"},
                    )
                    continue

                tx_handle = next_tx_handle

                if notify_enabled and rx_handle is not None:
                    try:
                        await client.stop_notify(rx_handle)
                    except Exception:
                        logger.debug("Failed to stop existing notification", exc_info=True)
                    notify_enabled = False

                rx_handle = next_rx_handle
                await client.start_notify(rx_handle, notification_handler)
                notify_enabled = True

                await _ws_send_json_safe(
                    websocket,
                    {
                        "type": "status",
                        "message": f"I/O Configured. TX handle: {tx_handle}, RX handle: {rx_handle}",
                    },
                )

            elif action == "send_hex":
                if not client or not client.is_connected or tx_handle is None:
                    await _ws_send_json_safe(
                        websocket,
                        {
                            "type": "error",
                            "message": "Connection or TX handle not set",
                        },
                    )
                    continue

                raw_hex = message.get("payload", "")
                if not isinstance(raw_hex, str):
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Invalid payload type"},
                    )
                    continue

                compact_hex = raw_hex.replace(" ", "")
                if not compact_hex:
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Payload is empty"},
                    )
                    continue

                try:
                    payload_bytes = bytearray.fromhex(compact_hex)
                except ValueError:
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Invalid hex string"},
                    )
                    continue

                try:
                    await client.write_gatt_char(tx_handle, payload_bytes, response=False)
                    logger.info(f"Wrote {len(payload_bytes)} bytes to handle {tx_handle}")
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "status", "message": "Command Sent"},
                    )
                except Exception as e:
                    logger.error(f"Failed to write to characteristic handle {tx_handle}: {e}")
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": f"Write failed: {str(e)}"},
                    )

            else:
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "message": f"Unsupported action: {action}"},
                )

    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket")
    except Exception:
        logger.exception("WebSocket error")
        await _ws_send_json_safe(
            websocket,
            {"type": "error", "message": "Internal server error"},
        )
    finally:
        await _disconnect_client()
        logger.info("BLE client disconnected")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
