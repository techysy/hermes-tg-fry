"""Python Bridge for hermes-tg-fry to Hermes Gateway.
Provides zero-crash escaping, expandable quote reasoning folding, and metric footers for Telegram.
"""

from __future__ import annotations

import html
import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger("hermes_tg_fry")


def escape_html(text: str) -> str:
    """Zero-crash escaping for Telegram HTML parse_mode: &, <, >."""
    if not text:
        return ""
    return html.escape(text, quote=False)


def render_telegram_card(
    title: Optional[str] = None,
    thought: Optional[str] = None,
    content: str = "",
    metrics: Optional[list[dict[str, Any]]] = None,
    is_streaming: bool = False,
) -> dict[str, Any]:
    """Render a structured Telegram HTML card matching the hermes-tg-fry specification."""
    parts = []

    if title:
        parts.append(f"<b>{escape_html(title)}</b>\n")

    if thought and thought.strip():
        streaming_tag = " <i>(typing...)</i>" if is_streaming else ""
        escaped_thought = escape_html(thought.strip())
        parts.append(f"<blockquote expandable><b>💭 Thinking Process</b>\n{escaped_thought}{streaming_tag}</blockquote>")

    if content and content.strip():
        # Preserve standard formatting or escape text
        parts.append(content.strip())

    if metrics:
        metric_items = []
        for m in metrics:
            label = escape_html(str(m.get("label", "")))
            val = escape_html(str(m.get("value", "")))
            unit = f" {escape_html(str(m.get('unit', '')))}" if m.get("unit") else ""
            icon = f"{m.get('icon', '')} " if m.get("icon") else ""
            metric_items.append(f"{icon}<b>{label}:</b> <code>{val}{unit}</code>")
        if metric_items:
            parts.append("📊 " + "  •  ".join(metric_items))

    return {
        "text": "\n\n".join(parts).strip(),
        "parseMode": "HTML",
    }
