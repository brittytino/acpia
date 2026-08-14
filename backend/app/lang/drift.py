"""Code-switch drift: change in Tamil share across a conversation."""
from dataclasses import dataclass
from datetime import datetime
from statistics import mean

from app.lang.detect import detect


@dataclass
class CodeSwitchDrift:
    windows: list[float]        # Tamil share per time window
    slope: float                # change in share per window
    delta: float                # last window minus first
    direction: str              # toward_tamil | toward_english | stable
    confidence: float


def compute_drift(
    messages: list[tuple[datetime, str]],
    window_count: int = 6,
) -> CodeSwitchDrift:
    if len(messages) < window_count * 2:
        return CodeSwitchDrift([], 0.0, 0.0, "stable", 0.0)

    ordered = sorted(messages, key=lambda m: m[0])
    size = len(ordered) // window_count

    windows: list[float] = []
    for i in range(window_count):
        chunk = ordered[i * size : (i + 1) * size]
        shares = [detect(text).tamil_share for _, text in chunk]
        windows.append(mean(shares) if shares else 0.0)

    # Least-squares slope over window index
    n = len(windows)
    xbar, ybar = (n - 1) / 2, mean(windows)
    num = sum((i - xbar) * (y - ybar) for i, y in enumerate(windows))
    den = sum((i - xbar) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    delta = windows[-1] - windows[0]

    direction = ("toward_tamil" if delta > 0.12
                 else "toward_english" if delta < -0.12
                 else "stable")

    # Confidence scales with sample size and effect magnitude, capped.
    confidence = min(0.85, abs(delta) * 1.6 + min(len(ordered) / 200, 0.30))

    return CodeSwitchDrift(windows, slope, delta, direction, round(confidence, 3))
