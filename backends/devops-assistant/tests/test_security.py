import os

import pytest
from fastapi import HTTPException

from security import verify_api_key
from config import config


def test_verify_api_key_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(config["security"], "require_api_key", False)
    assert verify_api_key() is True


def test_verify_api_key_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(config["security"], "require_api_key", True)
    monkeypatch.setenv("APP_API_KEY", "secret")
    assert verify_api_key("secret") is True


def test_verify_api_key_missing_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(config["security"], "require_api_key", True)
    monkeypatch.delenv("APP_API_KEY", raising=False)
    with pytest.raises(HTTPException) as exc:
        verify_api_key("secret")
    assert exc.value.status_code == 500


def test_verify_api_key_invalid_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(config["security"], "require_api_key", True)
    monkeypatch.setenv("APP_API_KEY", "secret")
    with pytest.raises(HTTPException) as exc:
        verify_api_key("wrong")
    assert exc.value.status_code == 401