# hermes-tg-fry 🍤

Telegram card rendering, AST formatting, 4096-limit smart paging, and streaming typewriter interaction plugin for **Hermes Agent Framework**.

## Features

- 📑 **Card Schema & Fluent Builder API**: Rich blocks including Text, Code, Expandable Quotes (for Thought processes & Tool calls), Metric Footers, Keyboards, and Media.
- 🛡️ **Zero-Crash Escaper**: Safe character escaping for Telegram HTML & MarkdownV2 parsing modes.
- ✂️ **Smart Pager (4096 Boundary Slicer)**: AST & block-aware chunking without breaking syntax, code blocks, or thinking quotes.
- ⚡ **Throttled Typewriter State Machine**: `DRAFT` -> `STREAMING` -> `FINALIZING` -> `COMPLETED` state management with rate-limit and delta throttling.
- 🔌 **Hermes Agent Adapter**: Easy integration hook to consume Hermes agent thinking, tool call, and chunk events.

## Installation

```bash
pnpm add hermes-tg-fry
# or
npm install hermes-tg-fry
```

## Quick Start

### 1. Fluent Card Builder & HTML Renderer

```typescript
import { CardBuilder, HtmlRenderer } from 'hermes-tg-fry';

const card = CardBuilder.create('Agent Task Execution')
  .thought('Analyzing user query and planning workflow...', false)
  .text('Task completed successfully!')
  .code('console.log("Hello, Hermes!");', 'typescript')
  .metric([
    { label: 'TPS', value: 52.4, unit: 'tok/s', icon: '⚡' },
    { label: 'Cost', value: '$0.0015', icon: '💰' }
  ])
  .keyboard([
    [{ text: 'View Run', url: 'https://hermes.ai' }],
    [{ text: 'Retry', callbackData: 'action_retry' }]
  ])
  .build();

const renderer = new HtmlRenderer();
const payload = renderer.render(card);

console.log(payload.text);
// Sends payload to Telegram Bot API with parse_mode: 'HTML' and reply_markup
```

### 2. Smart Pager for Long Messages

```typescript
import { SmartPager } from 'hermes-tg-fry';

const pager = new SmartPager({ maxChunkSize: 4000 });
const pages = pager.paginate(card);

// Automatically partitions blocks, splits oversized code/quote sections,
// and ensures footers & keyboards attach cleanly to the final page.
```

### 3. Streaming Typewriter with Hermes Adapter

```typescript
import { HermesTelegramFryPlugin } from 'hermes-tg-fry';

const plugin = new HermesTelegramFryPlugin({
  editTelegramMessage: async (chatId, messageId, result) => {
    // Call telegram bot api: editMessageText
  },
  sendTelegramMessage: async (chatId, result) => {
    // Call telegram bot api: sendMessage
  }
});

const session = plugin.createStreamingSession(
  plugin.createCard('Realtime Agent Session').build(),
  { chatId: 12345678, messageId: 9876 }
);

// Stream events from Hermes
session.updateCard((card) => {
  plugin.handleAgentEvent(card, {
    type: 'thought',
    payload: { content: 'Querying external API...' }
  });
});

// Finalize
await session.finalize();
```

## License

MIT © techysy
