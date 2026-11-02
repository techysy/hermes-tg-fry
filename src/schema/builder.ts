import {
  Card,
  CardBlock,
  TextBlock,
  CodeBlock,
  ExpandableQuoteBlock,
  MetricFooterBlock,
  ActionKeyboardBlock,
  ActionButton,
  MetricItem,
  TextContent,
  MediaType,
  MediaBlock,
} from './types.js';

export class CardBuilder {
  private card: Card;

  constructor(title?: string) {
    this.card = {
      title,
      blocks: [],
    };
  }

  public static create(title?: string): CardBuilder {
    return new CardBuilder(title);
  }

  public text(content: TextContent, id?: string): this {
    const block: TextBlock = {
      type: 'text',
      content,
      id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public code(code: string, language?: string, id?: string): this {
    const block: CodeBlock = {
      type: 'code',
      code,
      language,
      id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public quote(content: TextContent, options?: { title?: string; isStreaming?: boolean; id?: string }): this {
    const block: ExpandableQuoteBlock = {
      type: 'expandable_quote',
      content,
      title: options?.title,
      isStreaming: options?.isStreaming,
      id: options?.id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public thought(thoughtText: TextContent, isStreaming = false, id?: string): this {
    return this.quote(thoughtText, { title: '💭 Thinking Process', isStreaming, id });
  }

  public toolCall(toolName: string, argsText: string, resultText?: string, id?: string): this {
    const content = resultText
      ? `⚙️ Tool: ${toolName}\nInput:\n${argsText}\nOutput:\n${resultText}`
      : `⚙️ Tool: ${toolName}\nInput:\n${argsText}`;
    return this.quote(content, { title: `🔧 Tool Call [${toolName}]`, id });
  }

  public metric(metrics: MetricItem[], id?: string): this {
    const block: MetricFooterBlock = {
      type: 'metric_footer',
      metrics,
      id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public divider(id?: string): this {
    this.card.blocks.push({ type: 'divider', id });
    return this;
  }

  public keyboard(buttons: ActionButton[][], id?: string): this {
    const block: ActionKeyboardBlock = {
      type: 'action_keyboard',
      buttons,
      id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public media(mediaType: MediaType, urlOrFileId: string, caption?: TextContent, id?: string): this {
    const block: MediaBlock = {
      type: 'media',
      mediaType,
      urlOrFileId,
      caption,
      id,
    };
    this.card.blocks.push(block);
    return this;
  }

  public addBlock(block: CardBlock): this {
    this.card.blocks.push(block);
    return this;
  }

  public setMeta(meta: Record<string, unknown>): this {
    this.card.meta = { ...this.card.meta, ...meta };
    return this;
  }

  public build(): Card {
    return {
      ...this.card,
      blocks: [...this.card.blocks],
    };
  }
}
