import { describe, it, expect } from 'vitest';
import { CardBuilder } from '../src/schema/builder.js';

describe('CardBuilder & Schema', () => {
  it('should build a simple card with title and text', () => {
    const card = CardBuilder.create('Hello World')
      .text('This is a test message')
      .build();

    expect(card.title).toBe('Hello World');
    expect(card.blocks).toHaveLength(1);
    expect(card.blocks[0]).toEqual({
      type: 'text',
      content: 'This is a test message',
      id: undefined,
    });
  });

  it('should support rich text spans', () => {
    const card = CardBuilder.create()
      .text([
        { text: 'Normal ' },
        { text: 'Bold', bold: true },
        { text: ' Code', code: true },
        { text: ' Link', link: 'https://example.com' },
      ])
      .build();

    expect(card.blocks).toHaveLength(1);
    expect(card.blocks[0].type).toBe('text');
  });

  it('should build thinking and tool call quotes', () => {
    const card = CardBuilder.create()
      .thought('Analyzing user query...', true)
      .toolCall('web_search', JSON.stringify({ query: 'Telegram Bot' }), 'Search Results here')
      .build();

    expect(card.blocks).toHaveLength(2);
    expect(card.blocks[0].type).toBe('expandable_quote');
    expect(card.blocks[1].type).toBe('expandable_quote');
  });

  it('should build metric footer and keyboard', () => {
    const card = CardBuilder.create()
      .metric([
        { label: 'TPS', value: 45.2, unit: 'tok/s', icon: '⚡' },
        { label: 'Latency', value: 120, unit: 'ms' },
      ])
      .keyboard([
        [
          { text: 'Approve', callbackData: 'action_approve' },
          { text: 'Reject', callbackData: 'action_reject' },
        ],
        [{ text: 'Documentation', url: 'https://docs.hermes.ai' }],
      ])
      .build();

    expect(card.blocks).toHaveLength(2);
    expect(card.blocks[0].type).toBe('metric_footer');
    expect(card.blocks[1].type).toBe('action_keyboard');
  });
});
