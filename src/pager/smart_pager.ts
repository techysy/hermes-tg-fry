import { Card, CardBlock, TextBlock, CodeBlock, ExpandableQuoteBlock } from '../schema/types.js';
import { HtmlRenderer } from '../formatter/html.js';

export interface PagerOptions {
  maxChunkSize?: number; // Telegram limit is 4096, default 4000 for safe margin
  preserveFootersOnLastPage?: boolean;
}

export class SmartPager {
  private maxChunkSize: number;
  private renderer: HtmlRenderer;

  constructor(options: PagerOptions = {}) {
    this.maxChunkSize = options.maxChunkSize ?? 4000;
    this.renderer = new HtmlRenderer();
  }

  /**
   * Splits a Card into multiple Cards if its rendered size exceeds maxChunkSize.
   */
  public paginate(card: Card): Card[] {
    const rendered = this.renderer.render(card);
    if (rendered.text.length <= this.maxChunkSize) {
      return [card];
    }

    const pages: Card[] = [];
    let currentBlocks: CardBlock[] = [];
    let currentSize = 0;

    const keyboardBlocks = card.blocks.filter((b) => b.type === 'action_keyboard');
    const metricBlocks = card.blocks.filter((b) => b.type === 'metric_footer');
    const contentBlocks = card.blocks.filter(
      (b) => b.type !== 'action_keyboard' && b.type !== 'metric_footer'
    );

    const titlePrefix = card.title ? `<b>${card.title}</b>\n\n` : '';
    const titleSize = titlePrefix.length;

    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      const blockSize = this.calculateBlockSize(block);

      // If a single block exceeds the maxChunkSize, split the block itself
      if (blockSize > this.maxChunkSize) {
        // Flush previous page if exists
        if (currentBlocks.length > 0) {
          pages.push({
            title: pages.length === 0 ? card.title : undefined,
            blocks: currentBlocks,
            meta: { ...card.meta, pageIndex: pages.length },
          });
          currentBlocks = [];
          currentSize = 0;
        }

        const subBlocks = this.splitOversizedBlock(block, this.maxChunkSize - 100);
        for (const subBlock of subBlocks) {
          pages.push({
            title: pages.length === 0 ? card.title : undefined,
            blocks: [subBlock],
            meta: { ...card.meta, pageIndex: pages.length },
          });
        }
        continue;
      }

      const projectedSize = currentSize + (currentBlocks.length === 0 && pages.length === 0 ? titleSize : 0) + blockSize + 2;

      if (projectedSize > this.maxChunkSize && currentBlocks.length > 0) {
        pages.push({
          title: pages.length === 0 ? card.title : undefined,
          blocks: currentBlocks,
          meta: { ...card.meta, pageIndex: pages.length },
        });
        currentBlocks = [block];
        currentSize = blockSize;
      } else {
        currentBlocks.push(block);
        currentSize += blockSize + 2;
      }
    }

    if (currentBlocks.length > 0) {
      pages.push({
        title: pages.length === 0 ? card.title : undefined,
        blocks: currentBlocks,
        meta: { ...card.meta, pageIndex: pages.length },
      });
    }

    if (pages.length === 0) {
      return [card];
    }

    // Attach footer metrics and keyboards to the last page
    const lastPage = pages[pages.length - 1];
    lastPage.blocks.push(...metricBlocks);
    lastPage.blocks.push(...keyboardBlocks);

    // Annotate total pages
    const totalPages = pages.length;
    pages.forEach((p, idx) => {
      p.meta = {
        ...p.meta,
        pageIndex: idx + 1,
        totalPages,
      };
    });

    return pages;
  }

  private calculateBlockSize(block: CardBlock): number {
    return this.renderer.renderBlock(block).length;
  }

  private splitOversizedBlock(block: CardBlock, maxSliceSize: number): CardBlock[] {
    if (block.type === 'code') {
      return this.splitCodeBlock(block, maxSliceSize);
    }
    if (block.type === 'expandable_quote') {
      return this.splitQuoteBlock(block, maxSliceSize);
    }
    if (block.type === 'text') {
      return this.splitTextBlock(block, maxSliceSize);
    }
    return [block];
  }

  private splitCodeBlock(block: CodeBlock, maxSliceSize: number): CodeBlock[] {
    const lines = block.code.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > maxSliceSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.map((codePart, idx) => ({
      type: 'code',
      code: codePart,
      language: block.language,
      id: block.id ? `${block.id}_part_${idx + 1}` : undefined,
    }));
  }

  private splitQuoteBlock(block: ExpandableQuoteBlock, maxSliceSize: number): ExpandableQuoteBlock[] {
    const rawText = typeof block.content === 'string'
      ? block.content
      : block.content.map((c) => c.text).join('');

    const textSlices = this.sliceTextSmart(rawText, maxSliceSize);
    return textSlices.map((slice, idx) => ({
      type: 'expandable_quote',
      title: idx === 0 ? block.title : `${block.title ?? 'Quote'} (cont.)`,
      content: slice,
      id: block.id ? `${block.id}_part_${idx + 1}` : undefined,
    }));
  }

  private splitTextBlock(block: TextBlock, maxSliceSize: number): TextBlock[] {
    const rawText = typeof block.content === 'string'
      ? block.content
      : block.content.map((c) => c.text).join('');

    const textSlices = this.sliceTextSmart(rawText, maxSliceSize);
    return textSlices.map((slice, idx) => ({
      type: 'text',
      content: slice,
      id: block.id ? `${block.id}_part_${idx + 1}` : undefined,
    }));
  }

  private sliceTextSmart(text: string, maxSliceSize: number): string[] {
    const paragraphs = text.split('\n\n');
    const result: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      if ((current + '\n\n' + para).length > maxSliceSize && current.length > 0) {
        result.push(current);
        current = para;
      } else {
        current = current ? `${current}\n\n${para}` : para;
      }
    }
    if (current) {
      result.push(current);
    }

    return result;
  }
}
