import { Card, CardBlock, TextContent, TextSpan } from '../schema/types.js';
import { escapeMarkdownV2, escapeMarkdownV2Code } from './escaper.js';
import { TelegramRenderResult } from './html.js';

export class MarkdownV2Renderer {
  public render(card: Card): TelegramRenderResult {
    const parts: string[] = [];

    if (card.title) {
      parts.push(`*${escapeMarkdownV2(card.title)}*\n`);
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
      parseMode: 'MarkdownV2',
      ...(inlineKeyboard ? { replyMarkup: inlineKeyboard } : {}),
    };
  }

  public renderBlock(block: CardBlock): string {
    switch (block.type) {
      case 'text':
        return this.renderTextContent(block.content);

      case 'code': {
        const escapedCode = escapeMarkdownV2Code(block.code);
        const lang = block.language ? escapeMarkdownV2(block.language) : '';
        return `\`\`\`${lang}\n${escapedCode}\n\`\`\``;
      }

      case 'expandable_quote': {
        const body = this.renderTextContent(block.content);
        const titlePrefix = block.title ? `*${escapeMarkdownV2(block.title)}*\n` : '';
        const streamingIndicator = block.isStreaming ? ' _\\(typing\\.\\.\\.\\)_' : '';
        const rawContent = `${titlePrefix}${body}${streamingIndicator}`;
        // Telegram MarkdownV2 expandable quote syntax: **>quote
        const lines = rawContent.split('\n');
        return lines.map((l) => `**>${l}`).join('\n');
      }

      case 'metric_footer': {
        if (!block.metrics || block.metrics.length === 0) return '';
        const items = block.metrics.map((m) => {
          const icon = m.icon ? `${m.icon} ` : '';
          const unit = m.unit ? ` ${escapeMarkdownV2(m.unit)}` : '';
          return `${icon}*${escapeMarkdownV2(m.label)}:* \`${escapeMarkdownV2Code(String(m.value))}\`${unit}`;
        });
        return `📊 ${items.join('  •  ')}`;
      }

      case 'divider':
        return escapeMarkdownV2('────────────────');

      case 'media': {
        const caption = block.caption ? `\n${this.renderTextContent(block.caption)}` : '';
        return escapeMarkdownV2(`[Media: ${block.mediaType} (${block.urlOrFileId})]`) + caption;
      }

      case 'action_keyboard':
        return '';

      default:
        return '';
    }
  }

  public renderTextContent(content: TextContent): string {
    if (typeof content === 'string') {
      return escapeMarkdownV2(content);
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((span) => this.renderSpan(span))
      .join('');
  }

  private renderSpan(span: TextSpan): string {
    let text = escapeMarkdownV2(span.text);

    if (span.code) {
      text = `\`${escapeMarkdownV2Code(span.text)}\``;
    }
    if (span.bold) {
      text = `*${text}*`;
    }
    if (span.italic) {
      text = `_${text}_`;
    }
    if (span.strike) {
      text = `~${text}~`;
    }
    if (span.underline) {
      text = `__${text}__`;
    }
    if (span.spoiler) {
      text = `||${text}||`;
    }
    if (span.link) {
      text = `[${text}](${span.link})`;
    }

    return text;
  }
}
