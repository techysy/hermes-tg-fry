"""AST Patch & Interceptor for Hermes Gateway Telegram channel."""

from __future__ import annotations

import logging
from typing import Any, Optional
from .renderer import render_telegram_card

logger = logging.getLogger("hermes_tg_fry")


def on_telegram_format_response(
    agent_result: dict[str, Any],
    response: str,
    source: Any,
    turn_seconds: float = 0.0,
) -> str:
    """Intercepts and enhances response text for Telegram using 🍟 hermes-fry-cards formatting."""
    platform_val = getattr(getattr(source, "platform", None), "value", str(getattr(source, "platform", ""))).lower()
    if platform_val != "telegram":
        return response

    thought = agent_result.get("last_reasoning") or ""
    model_name = agent_result.get("model") or ""

    # Calculate performance metrics
    metrics = []
    in_tok = agent_result.get("input_tokens", 0)
    out_tok = agent_result.get("output_tokens", 0)
    total_tok = in_tok + out_tok

    if total_tok > 0:
        metrics.append({"label": "Tokens", "value": f"{total_tok}", "unit": "tok", "icon": "🪙"})

    if turn_seconds > 0 and out_tok > 0:
        tps = out_tok / turn_seconds
        metrics.append({"label": "TPS", "value": f"{tps:.1f}", "unit": "tok/s", "icon": "⚡"})

    # Render card
    card = render_telegram_card(
        thought=thought,
        content=response,
        metrics=metrics,
        model=model_name,
        turn_seconds=turn_seconds,
    )

    return card["text"]
