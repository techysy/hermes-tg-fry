import { describe, it, expect, vi } from 'vitest';
import { HermesTelegramFryPlugin } from '../src/adapter/hermes.js';

describe('Hermes Agent Adapter Plugin', () => {
  it('should process agent events and stream responses', async () => {
    const editMock = vi.fn().mockResolvedValue(true);
    const plugin = new HermesTelegramFryPlugin({
      editTelegramMessage: editMock,
    });

    const card = plugin.createCard('Agent Session').build();
    const session = plugin.createStreamingSession(card, {
      chatId: 123456,
      messageId: 999,
    });

    // Simulate Agent Thinking
    session.updateCard((c) => {
      plugin.handleAgentEvent(c, {
        type: 'thought',
        payload: { content: 'Querying database...' },
      });
    });

    // Simulate Tool Call
    session.updateCard((c) => {
      plugin.handleAgentEvent(c, {
        type: 'tool_call',
        payload: {
          toolCallId: 'call_1',
          toolName: 'sql_exec',
          args: { query: 'SELECT * FROM users;' },
        },
      });
    });

    // Simulate Chunk
    session.updateCard((c) => {
      plugin.handleAgentEvent(c, {
        type: 'chunk',
        payload: { chunk: 'Here are the user accounts.' },
      });
    });

    // Finalize
    await session.finalize((c) => {
      plugin.handleAgentEvent(c, {
        type: 'finish',
        payload: {
          metrics: [{ label: 'Cost', value: '$0.002' }],
        },
      });
    });

    expect(editMock).toHaveBeenCalled();
    const finalCard = session.getCard();
    expect(finalCard.blocks.some((b) => b.type === 'expandable_quote')).toBe(true);
    expect(finalCard.blocks.some((b) => b.type === 'metric_footer')).toBe(true);
  });
});
