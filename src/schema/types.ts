/**
 * Card Component & Schema Definitions for hermes-tg-fry
 */

export type BlockType =
  | 'text'
  | 'expandable_quote'
  | 'metric_footer'
  | 'action_keyboard'
  | 'media'
  | 'divider'
  | 'code';

export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  underline?: boolean;
  spoiler?: boolean;
  link?: string;
}

export type TextContent = string | TextSpan[];

export interface BaseBlock {
  id?: string;
  type: BlockType;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: TextContent;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  code: string;
  language?: string;
}

export interface ExpandableQuoteBlock extends BaseBlock {
  type: 'expandable_quote';
  title?: string;
  content: TextContent;
  isStreaming?: boolean;
}

export interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
}

export interface MetricFooterBlock extends BaseBlock {
  type: 'metric_footer';
  metrics: MetricItem[];
}

export interface ActionButton {
  text: string;
  callbackData?: string;
  url?: string;
  copyText?: string;
}

export interface ActionKeyboardBlock extends BaseBlock {
  type: 'action_keyboard';
  buttons: ActionButton[][];
}

export type MediaType = 'photo' | 'document' | 'video' | 'audio';

export interface MediaBlock extends BaseBlock {
  type: 'media';
  mediaType: MediaType;
  urlOrFileId: string;
  caption?: TextContent;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export type CardBlock =
  | TextBlock
  | CodeBlock
  | ExpandableQuoteBlock
  | MetricFooterBlock
  | ActionKeyboardBlock
  | MediaBlock
  | DividerBlock;

export interface Card {
  id?: string;
  title?: string;
  blocks: CardBlock[];
  meta?: Record<string, unknown>;
}
