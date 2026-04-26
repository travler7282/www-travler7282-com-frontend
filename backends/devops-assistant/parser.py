import re
from datetime import datetime


def parse_log_line(line: str):
    if not line.strip():
        return None
    
    pattern = r"^(?P<ts>\S+ \S+) (?P<level>\S+) (?P<service>\S+): (?P<msg>.+)$"
    match = re.match(pattern, line)

    if not match:
        return {
            "content": line,
            "metadata": {
                "level": "UNKNOWN",
                "service": "unknown"
            }
        }

    try:
        dt = datetime.strptime(match.group("ts"), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return {
            "content": line,
            "metadata": {
                "level": match.group("level"),
                "service": match.group("service")
            }
        }

    return {
        "content": match.group("msg"),
        "metadata": {
            "timestamp": dt.isoformat(),
            "timestamp_epoch": int(dt.timestamp()),
            "level": match.group("level"),
            "service": match.group("service")
        }
    }