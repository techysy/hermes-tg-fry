/**
 * Zero-crash safe string escaping for Telegram HTML and MarkdownV2 formats
 */

/**
 * Escapes characters for Telegram HTML mode:
 * & -> &amp;
 * < -> &lt;
 * > -> &gt;
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Characters to escape in Telegram MarkdownV2:
 * _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
const MARKDOWN_V2_SPECIAL_CHARS = /[_*[\]()~`>#+\-=|{}.!\\]/g;

/**
 * Escapes plain text for Telegram MarkdownV2 mode
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.replace(MARKDOWN_V2_SPECIAL_CHARS, '\\$&');
}

/**
 * Escapes code blocks in MarkdownV2 (only ` and \ must be escaped inside ``` ... ```)
 */
export function escapeMarkdownV2Code(text: string): string {
  if (!text) return '';
  return text.replace(/[`\\]/g, '\\$&');
}
