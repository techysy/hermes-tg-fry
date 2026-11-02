import { Card } from '../schema/types.js';
import { CardBuilder } from '../schema/builder.js';
import { HtmlRenderer, TelegramRenderResult } from '../formatter/html.js';
import { SmartPager } from '../pager/smart_pager.js';
import { ThrottledTypewriter, TypewriterOptions } from '../typewriter/session.js';

export interface HermesMessageContext {
  chatId: number | string;
  messageId?: number | string;
  sender?: {
    id: number | string;
    username?: string;
  };
}

export interface HermesAgentEvent {
  type: 'thought' | 'tool_call' | 'tool_result' | 'chunk' | 'finish' | 'error';
  payload: any;
}

export interface HermesPluginOptions {
  enableSmartPaging?: boolean;
  maxChunkSize?: number;
  typewriterOptions?: TypewriterOptions;
  sendTelegramMessage?: (chatId: number | string, result: TelegramRenderResult) => Promise<any>;
  editTelegramMessage?: (chatId: number | string, messageId: number | string, result: TelegramRenderResult) => Promise<any>;
}

export class HermesTelegramFryPlugin {
  private options: HermesPluginOptions;
  private renderer: HtmlRenderer;
  private pager: SmartPager;

  constructor(options: HermesPluginOptions = {}) {
    this.options = options;
    this.renderer = new HtmlRenderer();
    this.pager = new SmartPager({ maxChunkSize: options.maxChunkSize ?? 4000 });
  }

  /**
   * Helper to create a new CardBuilder
   */
  public createCard(title?: string): CardBuilder {
    return CardBuilder.create(title);
  }

  /**
   * Renders a card to Telegram payload (HTML mode)
   */
  public renderCard(card: Card): TelegramRenderResult {
    return this.renderer.render(card);
  }

  /**
   * Paginates a card if it exceeds Telegram limits
   */
  public paginateCard(card: Card): Card[] {
    return this.pager.paginate(card);
  }

  /**
   * Creates an active streaming typewriter session for progressive message updates
   */
  public createStreamingSession(
    initialCard: Card,
    context: HermesMessageContext,
    customOptions?: TypewriterOptions
  ): ThrottledTypewriter {
    const mergedOptions: TypewriterOptions = {
      ...this.options.typewriterOptions,
      ...customOptions,
      onFlush: async (result, isFinal) => {
        if (customOptions?.onFlush) {
          await customOptions.onFlush(result, isFinal);
        }
        if (context.messageId && this.options.editTelegramMessage) {
          await this.options.editTelegramMessage(context.chatId, context.messageId, result);
        } else if (!context.messageId && isFinal && this.options.sendTelegramMessage) {
          await this.options.sendTelegramMessage(context.chatId, result);
        }
      },
    };

    return new ThrottledTypewriter(initialCard, mergedOptions);
  }

  /**
   * Transforms Hermes agent streaming events into dynamic card updates
   */
  public handleAgentEvent(card: Card, event: HermesAgentEvent): void {
    switch (event.type) {
      case 'thought': {
        const thoughtBlock = card.blocks.find(
          (b) => b.type === 'expandable_quote' && b.id === 'agent_thinking'
        );
        if (thoughtBlock && thoughtBlock.type === 'expandable_quote') {
          thoughtBlock.content = event.payload.content ?? '';
          thoughtBlock.isStreaming = true;
        } else {
          card.blocks.unshift({
            id: 'agent_thinking',
            type: 'expandable_quote',
            title: '💭 Thinking Process',
            content: event.payload.content ?? '',
            isStreaming: true,
          });
        }
        break;
      }

      case 'tool_call': {
        const { toolName, args, toolCallId } = event.payload;
        card.blocks.push({
          id: `tool_${toolCallId ?? Date.now()}`,
          type: 'expandable_quote',
          title: `🔧 Tool Call [${toolName}]`,
          content: `Input:\n${typeof args === 'string' ? args : JSON.stringify(args, null, 2)}`,
        });
        break;
      }

      case 'tool_result': {
        const { toolCallId, result } = event.payload;
        const targetBlock = card.blocks.find((b) => b.id === `tool_${toolCallId}`);
        if (targetBlock && targetBlock.type === 'expandable_quote') {
          const currentText = typeof targetBlock.content === 'string' ? targetBlock.content : '';
          const resStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          targetBlock.content = `${currentText}\nOutput:\n${resStr}`;
        }
        break;
      }

      case 'chunk': {
        const textBlock = card.blocks.find((b) => b.type === 'text' && b.id === 'agent_response');
        if (textBlock && textBlock.type === 'text') {
          if (typeof textBlock.content === 'string') {
            textBlock.content += event.payload.chunk ?? '';
          }
        } else {
          card.blocks.push({
            id: 'agent_response',
            type: 'text',
            content: event.payload.chunk ?? '',
          });
        }
        break;
      }

      case 'finish': {
        // Thinking process finishes streaming
        const thoughtBlock = card.blocks.find(
          (b) => b.type === 'expandable_quote' && b.id === 'agent_thinking'
        );
        if (thoughtBlock && thoughtBlock.type === 'expandable_quote') {
          thoughtBlock.isStreaming = false;
        }

        // Attach metrics if present
        if (event.payload.metrics && Array.isArray(event.payload.metrics)) {
          card.blocks.push({
            type: 'metric_footer',
            metrics: event.payload.metrics,
          });
        }
        break;
      }
    }
  }
}
