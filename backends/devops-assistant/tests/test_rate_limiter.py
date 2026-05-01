from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import rate_limiter


def _request_with_ip(ip: str):
    return SimpleNamespace(client=SimpleNamespace(host=ip))


def test_get_client_ip_from_request() -> None:
    request = _request_with_ip("203.0.113.10")
    assert rate_limiter.get_client_ip(request) == "203.0.113.10"


def test_rate_limit_blocks_after_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rate_limiter, "ENABLED", True)
    monkeypatch.setattr(rate_limiter, "RATE_LIMIT", 2)
    monkeypatch.setattr(rate_limiter, "WINDOW_SECONDS", 60)
    rate_limiter.requests_log.clear()

    request = _request_with_ip("198.51.100.11")
    rate_limiter.rate_limit(request)
    rate_limiter.rate_limit(request)

    with pytest.raises(HTTPException) as exc:
        rate_limiter.rate_limit(request)

    assert exc.value.status_code == 429