"""Python Bridge for hermes-tg-fry to Hermes Gateway.
Provides zero-crash aesthetic Telegram HTML card formatting matching the 🍟/🍤 fry-cards design language.
"""

from __future__ import annotations

import html
import logging
from typing import Any, Optional

logger = logging.getLogger("hermes_tg_fry")


def escape_html(text: str) -> str:
    """Safe HTML entity escape for Telegram HTML parse_mode."""
    if not text:
        return ""
    return html.escape(text, quote=False)


def _truncate_model_name(name: str) -> str:
    """Keep concise model name: dots/dots3-note-prev -> dots3-note-prev."""
    if not name:
        return ""
    parts = name.split("/")
    return parts[-1]


def render_telegram_card(
    title: Optional[str] = None,
    thought: Optional[str] = None,
    content: str = "",
    metrics: Optional[list[dict[str, Any]]] = None,
    model: str = "",
    turn_seconds: float = 0.0,
) -> dict[str, Any]:
    """Render structured Telegram HTML card matching the 🍟/🍤 fry-cards aesthetic:
    - Native <blockquote expandable> collapsible panel
    - Content body
    - Compact badge footer: ⏱ 1.4s · ⚡️ 1,240 tok · 82 t/s · 梁文锋⚡️
    """
    parts = []

    model_display = _truncate_model_name(model)

    # 1. 🍤/🍟 Unified Foldable Header & Thinking Panel
    if thought and thought.strip():
        thought_clean = thought.strip()
        sec_str = f" ({turn_seconds:.1f}s)" if turn_seconds > 0 else ""
        header_text = f"<b>💭 思考过程{sec_str}</b>\n"
        escaped_thought = escape_html(thought_clean)
        parts.append(f"<blockquote expandable>{header_text}{escaped_thought}</blockquote>")

    # 2. Main Response Content
    if content and content.strip():
        cleaned_content = content.strip()
        parts.append(cleaned_content)

    # 3. Compact Metric Footer (对齐 claw-tg-fry / hermes-fry-cards 规范)
    footer_parts = ["🍤"]
    if turn_seconds > 0:
        footer_parts.append(f"⏱ {turn_seconds:.1f}s")

    if metrics:
        for m in metrics:
            label = str(m.get("label", ""))
            val = str(m.get("value", ""))
            unit = f" {m.get('unit', '')}" if m.get("unit") else ""
            if label.lower() == "tokens":
                footer_parts.append(f"⚡️ {val}{unit}")
            elif label.lower() == "tps":
                footer_parts.append(f"{val} t/s")

    if model_display:
        footer_parts.append(escape_html(model_display))

    if len(footer_parts) > 1:
        parts.append("<code>" + " · ".join(footer_parts) + "</code>")

    return {
        "text": "\n\n".join(parts).strip(),
        "parseMode": "HTML",
    }
