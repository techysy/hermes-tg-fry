import { Card, CardBlock, TextContent, TextSpan } from '../schema/types.js';
import { escapeHtml } from './escaper.js';

export interface TelegramRenderResult {
  text: string;
  parseMode: 'HTML' | 'MarkdownV2';
  replyMarkup?: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data?: string;
      url?: string;
      switch_inline_query_current_chat?: string;
    }>>;
  };
}

export class HtmlRenderer {
  public render(card: Card): TelegramRenderResult {
    const parts: string[] = [];

    if (card.title) {
      parts.push(`<b>${escapeHtml(card.title)}</b>\n`);
    }

    let inlineKeyboard: TelegramRenderResult['replyMarkup'] | undefined;

    for (const block of card.blocks) {
      if (block.type === 'action_keyboard') {
        inlineKeyboard = {
          inline_keyboard: block.buttons.map((row) =>
            row.map((btn) => ({
              text: btn.text,
              ...(btn.callbackData ? { callback_data: btn.callbackData } : {}),
              ...(btn.url ? { url: btn.url } : {}),
              ...(btn.copyText ? { switch_inline_query_current_chat: btn.copyText } : {}),
            }))
          ),
        };
        continue;
      }

      const renderedBlock = this.renderBlock(block);
      if (renderedBlock) {
        parts.push(renderedBlock);
      }
    }

    return {
      text: parts.join('\n\n').trim(),
      parseMode: 'HTML',
      ...(inlineKeyboard ? { replyMarkup: inlineKeyboard } : {}),
    };
  }

  public renderBlock(block: CardBlock): string {
    switch (block.type) {
      case 'text':
        return this.renderTextContent(block.content);

      case 'code': {
        const escapedCode = escapeHtml(block.code);
        if (block.language) {
          return `<pre><code class="language-${escapeHtml(block.language)}">${escapedCode}</code></pre>`;
        }
        return `<pre>${escapedCode}</pre>`;
      }

      case 'expandable_quote': {
        const body = this.renderTextContent(block.content);
        const titlePrefix = block.title ? `<b>${escapeHtml(block.title)}</b>\n` : '';
        const streamingIndicator = block.isStreaming ? ' <i>(typing...)</i>' : '';
        return `<blockquote expandable>${titlePrefix}${body}${streamingIndicator}</blockquote>`;
      }

      case 'metric_footer': {
        if (!block.metrics || block.metrics.length === 0) return '';
        const items = block.metrics.map((m) => {
          const icon = m.icon ? `${m.icon} ` : '';
          const unit = m.unit ? ` ${m.unit}` : '';
          return `${icon}<b>${escapeHtml(m.label)}:</b> <code>${escapeHtml(String(m.value))}${escapeHtml(unit)}</code>`;
        });
        return `📊 ${items.join('  •  ')}`;
      }

      case 'divider':
        return '────────────────';

      case 'media': {
        const caption = block.caption ? `\n${this.renderTextContent(block.caption)}` : '';
        return `[Media: ${block.mediaType} (${escapeHtml(block.urlOrFileId)})]${caption}`;
      }

      case 'action_keyboard':
        return '';

      default:
        return '';
    }
  }

  public renderTextContent(content: TextContent): string {
    if (typeof content === 'string') {
      return escapeHtml(content);
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((span) => this.renderSpan(span))
      .join('');
  }

  private renderSpan(span: TextSpan): string {
    let text = escapeHtml(span.text);

    if (span.code) {
      text = `<code>${text}</code>`;
    }
    if (span.bold) {
      text = `<b>${text}</b>`;
    }
    if (span.italic) {
      text = `<i>${text}</i>`;
    }
    if (span.strike) {
      text = `<s>${text}</s>`;
    }
    if (span.underline) {
      text = `<u>${text}</u>`;
    }
    if (span.spoiler) {
      text = `<tg-spoiler>${text}</tg-spoiler>`;
    }
    if (span.link) {
      text = `<a href="${escapeHtml(span.link)}">${text}</a>`;
    }

    return text;
  }
}
