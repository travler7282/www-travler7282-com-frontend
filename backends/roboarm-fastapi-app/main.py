import asyncio
import logging
from typing import Any, List, Optional

from bleak import BleakClient, BleakScanner
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

# Basic logging for BLE and WebSocket lifecycle events.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("roboarm-backend")

app = FastAPI(title="RoboArm BLE Controller")


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


@app.get("/scan", response_model=List[BLEDevice])
@app.get("/roboarm/api/v1/scan", response_model=List[BLEDevice])
async def scan_devices() -> List[BLEDevice]:
    """Scan for nearby BLE devices reachable from this runtime."""
    try:
        devices = await BleakScanner.discover(timeout=5.0)
        return [
            BLEDevice(name=device.name or "Unknown Device", address=device.address)
            for device in devices
        ]
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.websocket("/ws/terminal")
@app.websocket("/roboarm/api/v1/ws/terminal")
async def roboarm_ws_terminal(websocket: WebSocket) -> None:
    await websocket.accept()

    client: Optional[BleakClient] = None
    tx_uuid: Optional[str] = None
    rx_uuid: Optional[str] = None
    notify_enabled = False

    async def _disconnect_client() -> None:
        nonlocal notify_enabled
        if not client:
            return

        if client.is_connected and notify_enabled and rx_uuid:
            try:
                await client.stop_notify(rx_uuid)
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
                    chars = [char.uuid for char in service.characteristics]
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
                next_tx_uuid = message.get("tx_uuid")
                next_rx_uuid = message.get("rx_uuid")

                if not isinstance(next_tx_uuid, str) or not next_tx_uuid.strip():
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Missing or invalid tx_uuid"},
                    )
                    continue

                if not isinstance(next_rx_uuid, str) or not next_rx_uuid.strip():
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Missing or invalid rx_uuid"},
                    )
                    continue

                if not client or not client.is_connected:
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "message": "Not connected"},
                    )
                    continue

                tx_uuid = next_tx_uuid.strip()

                if notify_enabled and rx_uuid:
                    try:
                        await client.stop_notify(rx_uuid)
                    except Exception:
                        logger.debug("Failed to stop existing notification", exc_info=True)
                    notify_enabled = False

                rx_uuid = next_rx_uuid.strip()
                await client.start_notify(rx_uuid, notification_handler)
                notify_enabled = True

                await _ws_send_json_safe(
                    websocket,
                    {
                        "type": "status",
                        "message": f"I/O Configured. TX: {tx_uuid}, RX: {rx_uuid}",
                    },
                )

            elif action == "send_hex":
                if not client or not client.is_connected or not tx_uuid:
                    await _ws_send_json_safe(
                        websocket,
                        {
                            "type": "error",
                            "message": "Connection or TX UUID not set",
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

                await client.write_gatt_char(tx_uuid, payload_bytes, response=True)
                await _ws_send_json_safe(
                    websocket,
                    {"type": "status", "message": "Command Sent"},
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
