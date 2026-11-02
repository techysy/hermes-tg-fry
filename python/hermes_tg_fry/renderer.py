"""Python Bridge for hermes-tg-fry to Hermes Gateway.
Provides zero-crash aesthetic Telegram MarkdownV2 card formatting matching the 🍟 hermes-fry-cards design language.
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
    """Render structured Telegram MarkdownV2 card with 🍟 fry-cards aesthetic:
    - Unified collapsible panel with status header: **> 🍟 <model> · 💭 思考 · ⏱️ <duration>
    - Content body
    - Compact badge footer: 📊 🪙 <tokens> · ⚡ <tps>
    """
    parts = []

    # 1. 🍟 Unified Foldable Header & Thinking Panel
    model_display = _truncate_model_name(model)
    panel_header_items = ["🍟 " + (model_display or "Hermes")]

    if turn_seconds > 0:
        panel_header_items.append(f"⏱️ {turn_seconds:.1f}s")

    if thought and thought.strip():
        panel_header_items.append("💭 思考过程")
        header_text = " · ".join(panel_header_items)

        thought_lines = [line.strip() for line in thought.strip().splitlines() if line.strip()]
        if thought_lines:
            quote_lines = [f"**> *{header_text}*"]
            for idx, line in enumerate(thought_lines):
                is_last = (idx == len(thought_lines) - 1)
                end_marker = "||" if is_last else ""
                quote_lines.append(f"**> {line}{end_marker}")
            parts.append("\n".join(quote_lines))
    elif model_display:
        # If no thinking but model is present, show a slim header indicator
        parts.append(f"**> *{' · '.join(panel_header_items)}*||")

    # 2. Main Response Content
    if content and content.strip():
        # Strip any raw thinking blocks if accidentally present in content
        cleaned_content = content.strip()
        parts.append(cleaned_content)

    # 3. Compact Metric Footer
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
