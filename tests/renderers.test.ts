import { describe, it, expect } from 'vitest';
import { CardBuilder } from '../src/schema/builder.js';
import { HtmlRenderer } from '../src/formatter/html.js';
import { MarkdownV2Renderer } from '../src/formatter/markdown_v2.js';
import { escapeHtml, escapeMarkdownV2 } from '../src/formatter/escaper.js';

describe('Zero-Crash Escaper & Renderers', () => {
  it('should escape HTML sensitive characters correctly', () => {
    expect(escapeHtml('<script>alert("xss") & test</script>')).toBe(
      '&lt;script&gt;alert("xss") &amp; test&lt;/script&gt;'
    );
  });

  it('should escape MarkdownV2 special characters', () => {
    const raw = 'Hello_World *bold* [link](url) !';
    const escaped = escapeMarkdownV2(raw);
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\*');
    expect(escaped).toContain('\\[');
    expect(escaped).toContain('\\]');
    expect(escaped).toContain('\\!');
  });

  it('should render HTML with expandable quotes and metric footers', () => {
    const card = CardBuilder.create('Execution Result')
      .thought('Processing intent...', true)
      .text('The analysis is complete.')
      .code('const a = 1 < 2 && 3 > 2;', 'typescript')
      .metric([{ label: 'Tokens', value: 1250, unit: 'tok' }])
      .keyboard([[{ text: 'Retry', callbackData: 'retry_1' }]])
      .build();

    const renderer = new HtmlRenderer();
    const result = renderer.render(card);

    expect(result.parseMode).toBe('HTML');
    expect(result.text).toContain('<b>Execution Result</b>');
    expect(result.text).toContain('<blockquote expandable>');
    expect(result.text).toContain('&lt; 2 &amp;&amp; 3 &gt;');
    expect(result.text).toContain('📊 <b>Tokens:</b> <code>1250 tok</code>');
    expect(result.replyMarkup?.inline_keyboard).toHaveLength(1);
    expect(result.replyMarkup?.inline_keyboard[0][0].callback_data).toBe('retry_1');
  });

  it('should render MarkdownV2 correctly', () => {
    const card = CardBuilder.create('Status')
      .text('Task finished!')
      .code('echo "done"', 'bash')
      .build();

    const renderer = new MarkdownV2Renderer();
    const result = renderer.render(card);

    expect(result.parseMode).toBe('MarkdownV2');
    expect(result.text).toContain('*Status*');
    expect(result.text).toContain('Task finished\\!');
    expect(result.text).toContain('```bash\necho "done"\n```');
  });
});
