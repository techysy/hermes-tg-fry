"""Python Bridge for hermes-tg-fry to Hermes Gateway.
Provides zero-crash MarkdownV2 formatting, expandable quote reasoning folding, and metric footers for Telegram.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger("hermes_tg_fry")


def render_telegram_card(
    title: Optional[str] = None,
    thought: Optional[str] = None,
    content: str = "",
    metrics: Optional[list[dict[str, Any]]] = None,
    is_streaming: bool = False,
) -> dict[str, Any]:
    """Render structured Telegram MarkdownV2 card matching Hermes TelegramAdapter expectations."""
    parts = []

    if title:
        parts.append(f"*{title}*\n")

    if thought and thought.strip():
        lines = [line.strip() for line in thought.strip().splitlines() if line.strip()]
        if lines:
            quote_lines = ["**> 💭 *Thinking Process*"]
            for idx, line in enumerate(lines):
                is_last = (idx == len(lines) - 1)
                end_marker = "||" if is_last else ""
                quote_lines.append(f"**> {line}{end_marker}")
            parts.append("\n".join(quote_lines))

    if content and content.strip():
        parts.append(content.strip())

    if metrics:
        metric_items = []
        for m in metrics:
            label = str(m.get("label", ""))
            val = str(m.get("value", ""))
            unit = f" {m.get('unit', '')}" if m.get("unit") else ""
            icon = f"{m.get('icon', '')} " if m.get("icon") else ""
            metric_items.append(f"{icon}*{label}:* `{val}{unit}`")
        if metric_items:
            parts.append("📊 " + "  •  ".join(metric_items))

    return {
        "text": "\n\n".join(parts).strip(),
        "parseMode": "MarkdownV2",
    }
