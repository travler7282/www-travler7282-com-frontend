import os
import random
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="WXStation Weather Monitor")

cors_origins = [
    o.strip()
    for o in os.getenv("WXSTATION_CORS_ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
] or ["*"]

allow_credentials = "*" not in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LocalConditions(BaseModel):
    temperature_f: float
    humidity_pct: float
    pressure_inhg: float
    wind_speed_mph: float
    wind_direction_deg: int
    rainfall_in: float
    uv_index: float
    timestamp: str


class NwsForecast(BaseModel):
    period: str
    short_forecast: str
    temperature_f: int
    wind_speed: str
    wind_direction: str
    timestamp: str


class WeatherSummary(BaseModel):
    local: LocalConditions
    nws: NwsForecast


def _mock_local() -> LocalConditions:
    """Return plausible mock sensor readings. Replace with real sensor reads."""
    return LocalConditions(
        temperature_f=round(random.uniform(55.0, 85.0), 1),
        humidity_pct=round(random.uniform(30.0, 90.0), 1),
        pressure_inhg=round(random.uniform(29.6, 30.4), 2),
        wind_speed_mph=round(random.uniform(0.0, 20.0), 1),
        wind_direction_deg=random.randint(0, 359),
        rainfall_in=round(random.uniform(0.0, 0.5), 2),
        uv_index=round(random.uniform(0.0, 10.0), 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _mock_nws() -> NwsForecast:
    """Return a static mock NWS forecast. Replace with live NWS API call."""
    forecasts = [
        "Mostly Sunny",
        "Partly Cloudy",
        "Chance of Showers",
        "Thunderstorms Likely",
        "Clear",
    ]
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return NwsForecast(
        period="This Afternoon",
        short_forecast=random.choice(forecasts),
        temperature_f=random.randint(60, 90),
        wind_speed=f"{random.randint(5, 20)} mph",
        wind_direction=random.choice(directions),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/healthz")
@app.get("/wxstation/api/v1/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
@app.get("/wxstation/api/v1/readyz")
async def readyz() -> dict[str, str]:
    return {"status": "ready"}


@app.get("/wxstation/api/v1/conditions/local", response_model=LocalConditions)
async def local_conditions() -> LocalConditions:
    """Current local sensor readings."""
    return _mock_local()


@app.get("/wxstation/api/v1/conditions/nws", response_model=NwsForecast)
async def nws_forecast() -> NwsForecast:
    """Latest NWS forecast for the configured location."""
    return _mock_nws()


@app.get("/wxstation/api/v1/conditions", response_model=WeatherSummary)
async def conditions() -> WeatherSummary:
    """Combined local sensor data and NWS forecast."""
    return WeatherSummary(local=_mock_local(), nws=_mock_nws())


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
