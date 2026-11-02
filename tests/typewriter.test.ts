import { describe, it, expect, vi } from 'vitest';
import { CardBuilder } from '../src/schema/builder.js';
import { ThrottledTypewriter } from '../src/typewriter/session.js';

describe('ThrottledTypewriter State Machine', () => {
  it('should manage lifecycle states and throttle updates', async () => {
    const onFlush = vi.fn();
    const initialCard = CardBuilder.create('Streaming Task')
      .thought('Starting...', true)
      .build();

    const typewriter = new ThrottledTypewriter(initialCard, {
      minIntervalMs: 50,
      minDeltaChars: 10,
      onFlush,
    });

    expect(typewriter.getState()).toBe('DRAFT');

    // Trigger update
    typewriter.updateCard((c) => {
      c.blocks.push({
        type: 'text',
        content: 'Streaming chunk 1 with sufficient length to trigger delta check.',
      });
    });

    expect(typewriter.getState()).toBe('STREAMING');

    // Wait for timer flush
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(onFlush).toHaveBeenCalled();

    // Finalize
    const finalResult = await typewriter.finalize((c) => {
      c.blocks.push({
        type: 'metric_footer',
        metrics: [{ label: 'Done', value: '100%' }],
      });
    });

    expect(typewriter.getState()).toBe('COMPLETED');
    expect(finalResult.text).toContain('Done');
    // Ensure thinking block isStreaming is turned off
    const thought = typewriter.getCard().blocks.find((b) => b.type === 'expandable_quote');
    if (thought && thought.type === 'expandable_quote') {
      expect(thought.isStreaming).toBe(false);
    }
  });
});
