from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
SPEC = spec_from_file_location("wxstation_main", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

app = MODULE.app
_mock_local = MODULE._mock_local
_mock_nws = MODULE._mock_nws


def test_healthz_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_combined_conditions_endpoint_shape() -> None:
    client = TestClient(app)
    response = client.get("/wxstation/api/v1/conditions")
    assert response.status_code == 200
    payload = response.json()
    assert "local" in payload
    assert "nws" in payload


def test_mock_ranges_are_plausible() -> None:
    local = _mock_local()
    nws = _mock_nws()

    assert 55.0 <= local.temperature_f <= 85.0
    assert 30.0 <= local.humidity_pct <= 90.0
    assert 0 <= local.wind_direction_deg <= 359
    assert 60 <= nws.temperature_f <= 90