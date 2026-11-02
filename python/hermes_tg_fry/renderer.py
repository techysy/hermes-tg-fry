"""Python Bridge for hermes-tg-fry to Hermes Gateway.
Provides clean, aesthetic native Telegram formatting:
- Standard Markdown quote for thinking process (clean native quote bar)
- Pure clean response body
- Minimalist notation footer: 🍟 dots3-note-prev · ⏱ 2.4s · ⚡ 48.5 tok/s · 🪙 160 tok
"""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger("hermes_tg_fry")


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
    """Render clean aesthetic native Telegram message (Option 2):
    1. Elegant quote block for thinking (standard Markdown >)
    2. Pure natural response body (clean paragraphs, no messy tags)
    3. Minimalist notation footer
    """
    parts = []

    model_display = _truncate_model_name(model)

    # 1. Elegant standard quote for thinking
    if thought and thought.strip():
        sec_str = f" ({turn_seconds:.1f}s)" if turn_seconds > 0 else ""
        header = f"> 💭 思考过程{sec_str}"
        lines = [line.strip() for line in thought.strip().splitlines() if line.strip()]
        if lines:
            # 限制最多显示主要思考内容，保持气泡清爽
            quote_lines = [header]
            for line in lines:
                quote_lines.append(f"> {line}")
            parts.append("\n".join(quote_lines))

    # 2. Main Response Content
    if content and content.strip():
        parts.append(content.strip())

    # 3. Minimalist Notation Footer
    footer_parts = []
    if model_display:
        footer_parts.append(f"🍟 {model_display}")

    if turn_seconds > 0:
        footer_parts.append(f"⏱ {turn_seconds:.1f}s")

    if metrics:
        for m in metrics:
            label = str(m.get("label", ""))
            val = str(m.get("value", ""))
            unit = f" {m.get('unit', '')}" if m.get("unit") else ""
            if label.lower() == "tokens":
                footer_parts.append(f"🪙 {val}{unit}")
            elif label.lower() == "tps":
                footer_parts.append(f"⚡ {val} tok/s")

    if footer_parts:
        parts.append(" · ".join(footer_parts))

    return {
        "text": "\n\n".join(parts).strip(),
        "parseMode": "MarkdownV2",
    }
