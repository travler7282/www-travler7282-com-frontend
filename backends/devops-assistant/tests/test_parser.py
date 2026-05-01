from parser import parse_log_line


def test_parse_valid_log_line() -> None:
    parsed = parse_log_line("2026-04-30 10:30:00 INFO api: service started")
    assert parsed is not None
    assert parsed["content"] == "service started"
    assert parsed["metadata"]["level"] == "INFO"
    assert parsed["metadata"]["service"] == "api"
    assert "timestamp_epoch" in parsed["metadata"]


def test_parse_invalid_format_falls_back() -> None:
    parsed = parse_log_line("just some plain text")
    assert parsed is not None
    assert parsed["content"] == "just some plain text"
    assert parsed["metadata"]["level"] == "UNKNOWN"
    assert parsed["metadata"]["service"] == "unknown"


def test_parse_blank_line_returns_none() -> None:
    assert parse_log_line("   ") is None