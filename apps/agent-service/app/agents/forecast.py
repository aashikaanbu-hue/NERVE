from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
LOCAL_TIMEZONE = timezone(
    timedelta(
        hours=5,
        minutes=30,
    ),
)

RiskLevel = Literal[
    "NORMAL",
    "WATCH",
    "WARNING",
    "CRITICAL",
]


class CorridorForecastRequest(BaseModel):
    agentRunId: str = Field(min_length=1)
    corridorId: str = Field(min_length=1)
    corridorCode: str | None = None
    corridorName: str = Field(min_length=1)

    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    existingRiskScore: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    slopeSusceptibility: float = Field(
        default=50,
        ge=0,
        le=100,
    )


class ForecastMetrics(BaseModel):
    antecedentRainfall72hMm: float
    forecastRainfall24hMm: float
    forecastRainfall72hMm: float
    maximumPrecipitationProbability: float
    meanSurfaceSoilMoisture24h: float | None
    proactiveRiskScore: float
    riskLevel: RiskLevel
    rainfallTrend: Literal[
        "INTENSIFYING",
        "STEADY",
        "EASING",
    ]


class ForecastToolCall(BaseModel):
    toolName: str
    status: Literal[
        "SUCCEEDED",
        "FAILED",
    ]
    result: dict[str, Any]


class CorridorForecastAnalysis(BaseModel):
    agentRunId: str
    corridorId: str
    corridorCode: str | None
    corridorName: str

    status: Literal["COMPLETED"]
    assessmentStatus: RiskLevel

    source: str
    methodology: str

    metrics: ForecastMetrics
    riskFactors: list[str]

    reasoning: str
    recommendedAction: str

    requiresApproval: bool
    automaticExecutionBlocked: bool
    nextAgent: Literal["IMPACT"] | None

    forecastStart: str
    forecastEnd: str
    generatedAt: str

    limitations: list[str]
    toolCalls: list[ForecastToolCall]


def _safe_number(
    value: object,
) -> float | None:
    if isinstance(
        value,
        (int, float),
    ):
        return float(value)

    return None


def _series_value(
    values: object,
    index: int,
) -> float | None:
    if not isinstance(values, list):
        return None

    if index >= len(values):
        return None

    return _safe_number(values[index])


def _sum_values(
    values: list[float],
) -> float:
    return round(
        sum(values),
        2,
    )


def _mean_values(
    values: list[float],
) -> float | None:
    if not values:
        return None

    return round(
        sum(values) / len(values),
        4,
    )


def _calculate_risk_score(
    existing_risk_score: float,
    slope_susceptibility: float,
    antecedent_rainfall_72h: float,
    forecast_rainfall_24h: float,
    forecast_rainfall_72h: float,
) -> float:
    existing_risk_component = (
        existing_risk_score * 0.20
    )

    slope_component = (
        slope_susceptibility * 0.20
    )

    antecedent_component = min(
        20,
        antecedent_rainfall_72h / 10,
    )

    forecast_24h_component = min(
        25,
        forecast_rainfall_24h / 4,
    )

    forecast_72h_component = min(
        15,
        forecast_rainfall_72h / 10,
    )

    score = (
        existing_risk_component
        + slope_component
        + antecedent_component
        + forecast_24h_component
        + forecast_72h_component
    )

    return round(
        min(100, score),
        1,
    )


def _risk_level(
    score: float,
) -> RiskLevel:
    if score >= 75:
        return "CRITICAL"

    if score >= 55:
        return "WARNING"

    if score >= 35:
        return "WATCH"

    return "NORMAL"


def _rainfall_trend(
    antecedent_rainfall_72h: float,
    forecast_rainfall_24h: float,
) -> Literal[
    "INTENSIFYING",
    "STEADY",
    "EASING",
]:
    recent_daily_average = (
        antecedent_rainfall_72h / 3
    )

    if (
        recent_daily_average <= 1
        and forecast_rainfall_24h >= 5
    ):
        return "INTENSIFYING"

    if (
        forecast_rainfall_24h
        > recent_daily_average * 1.25
    ):
        return "INTENSIFYING"

    if (
        recent_daily_average > 0
        and forecast_rainfall_24h
        < recent_daily_average * 0.65
    ):
        return "EASING"

    return "STEADY"


def _recommended_action(
    level: RiskLevel,
) -> str:
    if level == "CRITICAL":
        return (
            "Escalate the forecast to the authority, request "
            "field verification and run a supervised community "
            "impact assessment. Do not close a road automatically."
        )

    if level == "WARNING":
        return (
            "Place the corridor under warning, verify current "
            "passability and prepare contingency routes and "
            "supplies for human review."
        )

    if level == "WATCH":
        return (
            "Place the corridor under watch and refresh the "
            "forecast before the next operational review."
        )

    return (
        "Continue routine monitoring. No operational restriction "
        "is recommended from forecast data alone."
    )


def _risk_factors(
    existing_risk_score: float,
    slope_susceptibility: float,
    antecedent_rainfall_72h: float,
    forecast_rainfall_24h: float,
    forecast_rainfall_72h: float,
    rainfall_trend: str,
) -> list[str]:
    factors: list[str] = []

    if existing_risk_score >= 60:
        factors.append(
            "The corridor already has an elevated operational risk score."
        )

    if slope_susceptibility >= 65:
        factors.append(
            "Stored terrain context indicates elevated slope susceptibility."
        )

    if antecedent_rainfall_72h >= 70:
        factors.append(
            "Heavy antecedent rainfall may have increased slope saturation."
        )

    if forecast_rainfall_24h >= 50:
        factors.append(
            "Heavy rainfall is forecast during the next 24 hours."
        )

    if forecast_rainfall_72h >= 120:
        factors.append(
            "High cumulative rainfall is forecast during the next 72 hours."
        )

    if rainfall_trend == "INTENSIFYING":
        factors.append(
            "Forecast rainfall is intensifying compared with the recent daily average."
        )

    if not factors:
        factors.append(
            "No elevated rainfall or stored terrain signal crossed the watch thresholds."
        )

    return factors


def analyse_corridor_forecast(
    payload: CorridorForecastRequest,
) -> CorridorForecastAnalysis:
    parameters = {
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "hourly": (
            "precipitation,"
            "precipitation_probability,"
            "soil_moisture_0_to_1cm"
        ),
        "past_hours": 72,
        "forecast_hours": 72,
        "timezone": "Asia/Kolkata",
        "precipitation_unit": "mm",
    }

    try:
        with httpx.Client(
            timeout=15,
        ) as client:
            response = client.get(
                OPEN_METEO_URL,
                params=parameters,
            )

            response.raise_for_status()
            weather_data = response.json()

    except httpx.HTTPError as error:
        raise RuntimeError(
            "Open-Meteo forecast data could not be retrieved."
        ) from error

    if not isinstance(
        weather_data,
        dict,
    ):
        raise RuntimeError(
            "Open-Meteo returned an invalid response."
        )

    hourly = weather_data.get(
        "hourly",
    )

    if not isinstance(
        hourly,
        dict,
    ):
        raise RuntimeError(
            "Open-Meteo response does not contain hourly data."
        )

    times = hourly.get(
        "time",
    )

    if not isinstance(
        times,
        list,
    ):
        raise RuntimeError(
            "Open-Meteo response does not contain forecast timestamps."
        )

    precipitation_values = hourly.get(
        "precipitation",
    )

    probability_values = hourly.get(
        "precipitation_probability",
    )

    soil_moisture_values = hourly.get(
        "soil_moisture_0_to_1cm",
    )

    now_local = datetime.now(
        LOCAL_TIMEZONE,
    ).replace(
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=None,
    )

    past_start = (
        now_local - timedelta(hours=72)
    )

    forecast_24h_end = (
        now_local + timedelta(hours=24)
    )

    forecast_72h_end = (
        now_local + timedelta(hours=72)
    )

    antecedent_rainfall: list[float] = []
    forecast_rainfall_24h: list[float] = []
    forecast_rainfall_72h: list[float] = []
    forecast_probabilities: list[float] = []
    forecast_soil_moisture_24h: list[float] = []
    future_times: list[datetime] = []

    for index, raw_time in enumerate(
        times,
    ):
        try:
            observed_at = datetime.fromisoformat(
                str(raw_time),
            )
        except ValueError:
            continue

        precipitation = (
            _series_value(
                precipitation_values,
                index,
            )
            or 0
        )

        probability = _series_value(
            probability_values,
            index,
        )

        soil_moisture = _series_value(
            soil_moisture_values,
            index,
        )

        if (
            past_start
            <= observed_at
            < now_local
        ):
            antecedent_rainfall.append(
                precipitation,
            )

        if (
            now_local
            <= observed_at
            < forecast_24h_end
        ):
            forecast_rainfall_24h.append(
                precipitation,
            )

            if soil_moisture is not None:
                forecast_soil_moisture_24h.append(
                    soil_moisture,
                )

        if (
            now_local
            <= observed_at
            < forecast_72h_end
        ):
            forecast_rainfall_72h.append(
                precipitation,
            )

            future_times.append(
                observed_at,
            )

            if probability is not None:
                forecast_probabilities.append(
                    probability,
                )

    if not future_times:
        raise RuntimeError(
            "Open-Meteo did not return future forecast hours."
        )

    antecedent_total = _sum_values(
        antecedent_rainfall,
    )

    forecast_24h_total = _sum_values(
        forecast_rainfall_24h,
    )

    forecast_72h_total = _sum_values(
        forecast_rainfall_72h,
    )

    maximum_probability = round(
        max(
            forecast_probabilities,
            default=0,
        ),
        1,
    )

    mean_soil_moisture = _mean_values(
        forecast_soil_moisture_24h,
    )

    risk_score = _calculate_risk_score(
        payload.existingRiskScore,
        payload.slopeSusceptibility,
        antecedent_total,
        forecast_24h_total,
        forecast_72h_total,
    )

    level = _risk_level(
        risk_score,
    )

    trend = _rainfall_trend(
        antecedent_total,
        forecast_24h_total,
    )

    factors = _risk_factors(
        payload.existingRiskScore,
        payload.slopeSusceptibility,
        antecedent_total,
        forecast_24h_total,
        forecast_72h_total,
        trend,
    )

    reasoning = (
        f"NERVE Forecast analysed real weather-model data for "
        f"{payload.corridorName}. The previous 72 hours contain "
        f"{antecedent_total:.1f} mm of precipitation, while "
        f"{forecast_24h_total:.1f} mm is forecast for the next "
        f"24 hours and {forecast_72h_total:.1f} mm for the next "
        f"72 hours. The explainable scenario score is "
        f"{risk_score:.1f}/100, producing a {level} status. "
        f"This score is an operational screening indicator, "
        f"not a calibrated landslide probability."
    )

    generated_at = datetime.now(
        LOCAL_TIMEZONE,
    ).isoformat()

    metrics = ForecastMetrics(
        antecedentRainfall72hMm=antecedent_total,
        forecastRainfall24hMm=forecast_24h_total,
        forecastRainfall72hMm=forecast_72h_total,
        maximumPrecipitationProbability=maximum_probability,
        meanSurfaceSoilMoisture24h=mean_soil_moisture,
        proactiveRiskScore=risk_score,
        riskLevel=level,
        rainfallTrend=trend,
    )

    tool_calls = [
        ForecastToolCall(
            toolName="fetch_open_meteo_forecast",
            status="SUCCEEDED",
            result={
                "provider": "Open-Meteo",
                "latitude": weather_data.get(
                    "latitude",
                ),
                "longitude": weather_data.get(
                    "longitude",
                ),
                "elevation": weather_data.get(
                    "elevation",
                ),
                "timezone": weather_data.get(
                    "timezone",
                ),
                "forecastHours": len(
                    future_times,
                ),
            },
        ),
        ForecastToolCall(
            toolName="calculate_proactive_corridor_risk",
            status="SUCCEEDED",
            result={
                "methodology": (
                    "weather-terrain-screening-v1"
                ),
                "riskScore": risk_score,
                "riskLevel": level,
                "rainfallTrend": trend,
                "automaticExecutionBlocked": True,
            },
        ),
    ]

    return CorridorForecastAnalysis(
        agentRunId=payload.agentRunId,
        corridorId=payload.corridorId,
        corridorCode=payload.corridorCode,
        corridorName=payload.corridorName,
        status="COMPLETED",
        assessmentStatus=level,
        source=(
            "Open-Meteo Weather Forecast API"
        ),
        methodology=(
            "weather-terrain-screening-v1"
        ),
        metrics=metrics,
        riskFactors=factors,
        reasoning=reasoning,
        recommendedAction=(
            _recommended_action(
                level,
            )
        ),
        requiresApproval=True,
        automaticExecutionBlocked=True,
        nextAgent=(
            "IMPACT"
            if level
            in {
                "WARNING",
                "CRITICAL",
            }
            else None
        ),
        forecastStart=min(
            future_times,
        ).isoformat(),
        forecastEnd=max(
            future_times,
        ).isoformat(),
        generatedAt=generated_at,
        limitations=[
            (
                "The score is a transparent screening heuristic "
                "and is not a calibrated probability."
            ),
            (
                "Weather-model precipitation may differ from "
                "ground observations."
            ),
            (
                "Stored slope susceptibility is contextual input "
                "and must be validated with authoritative terrain data."
            ),
            (
                "A forecast alert does not automatically close a "
                "road, reroute a delivery or notify a community."
            ),
            (
                "Named human authority approval and field verification "
                "remain required for critical operational action."
            ),
        ],
        toolCalls=tool_calls,
    )