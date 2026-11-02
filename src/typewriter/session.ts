import { Card } from '../schema/types.js';
import { HtmlRenderer, TelegramRenderResult } from '../formatter/html.js';

export type TypewriterState = 'DRAFT' | 'STREAMING' | 'FINALIZING' | 'COMPLETED';

export interface TypewriterOptions {
  minIntervalMs?: number; // Minimum interval between telegram edits (e.g. 1000ms to stay well below TG limits)
  minDeltaChars?: number; // Minimum character change to trigger intermediate update
  onFlush?: (result: TelegramRenderResult, isFinal: boolean) => Promise<void> | void;
}

export class ThrottledTypewriter {
  private state: TypewriterState = 'DRAFT';
  private currentCard: Card;
  private lastFlushedText = '';
  private lastFlushTimestamp = 0;
  private minIntervalMs: number;
  private minDeltaChars: number;
  private onFlush?: (result: TelegramRenderResult, isFinal: boolean) => Promise<void> | void;
  private renderer: HtmlRenderer;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private hasPendingUpdate = false;

  constructor(initialCard: Card, options: TypewriterOptions = {}) {
    this.currentCard = initialCard;
    this.minIntervalMs = options.minIntervalMs ?? 1000;
    this.minDeltaChars = options.minDeltaChars ?? 20;
    this.onFlush = options.onFlush;
    this.renderer = new HtmlRenderer();
  }

  public getState(): TypewriterState {
    return this.state;
  }

  public getCard(): Card {
    return this.currentCard;
  }

  /**
   * Updates the card content during streaming.
   */
  public updateCard(updater: (card: Card) => void): void {
    if (this.state === 'COMPLETED') {
      throw new Error('Cannot update card in COMPLETED state');
    }

    this.state = 'STREAMING';
    updater(this.currentCard);
    this.scheduleCheck();
  }

  /**
   * Schedules a throttled flush check.
   */
  private scheduleCheck(): void {
    const now = Date.now();
    const timeSinceLastFlush = now - this.lastFlushTimestamp;
    const currentRender = this.renderer.render(this.currentCard);
    const deltaChars = Math.abs(currentRender.text.length - this.lastFlushedText.length);

    if (timeSinceLastFlush >= this.minIntervalMs && deltaChars >= this.minDeltaChars) {
      this.triggerFlush(false);
    } else {
      this.hasPendingUpdate = true;
      if (!this.flushTimer) {
        const remainingTime = Math.max(10, this.minIntervalMs - timeSinceLastFlush);
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          if (this.hasPendingUpdate && this.state === 'STREAMING') {
            this.triggerFlush(false);
          }
        }, remainingTime);
      }
    }
  }

  /**
   * Triggers an immediate render flush
   */
  private async triggerFlush(isFinal: boolean): Promise<void> {
    if (this.isFlushing) {
      this.hasPendingUpdate = true;
      return;
    }

    this.isFlushing = true;
    this.hasPendingUpdate = false;
    this.lastFlushTimestamp = Date.now();

    const rendered = this.renderer.render(this.currentCard);
    this.lastFlushedText = rendered.text;

    try {
      if (this.onFlush) {
        await this.onFlush(rendered, isFinal);
      }
    } finally {
      this.isFlushing = false;
      if (this.hasPendingUpdate && !isFinal && this.state === 'STREAMING') {
        this.scheduleCheck();
      }
    }
  }

  /**
   * Finalizes the typewriter session, ensuring the latest content is flushed.
   */
  public async finalize(finalUpdater?: (card: Card) => void): Promise<TelegramRenderResult> {
    if (this.state === 'COMPLETED') {
      return this.renderer.render(this.currentCard);
    }

    this.state = 'FINALIZING';
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (finalUpdater) {
      finalUpdater(this.currentCard);
    }

    // Turn off streaming indicators in expandable quotes
    for (const block of this.currentCard.blocks) {
      if (block.type === 'expandable_quote' && block.isStreaming) {
        block.isStreaming = false;
      }
    }

    await this.triggerFlush(true);
    this.state = 'COMPLETED';

    return this.renderer.render(this.currentCard);
  }
}
