from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
SPEC = spec_from_file_location("roboarm_main", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

app = MODULE.app
_format_hex_payload = MODULE._format_hex_payload


def test_healthz_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readyz_prefixed_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/roboarm/api/v1/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_hex_payload_formatting() -> None:
    assert _format_hex_payload(bytes([0x1, 0x2A, 0xFF])) == "01 2A FF"