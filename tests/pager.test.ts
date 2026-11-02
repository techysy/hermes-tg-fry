import { describe, it, expect } from 'vitest';
import { CardBuilder } from '../src/schema/builder.js';
import { SmartPager } from '../src/pager/smart_pager.js';

describe('SmartPager (4096 Boundary Slicer)', () => {
  it('should not split cards within limit', () => {
    const card = CardBuilder.create('Small Card')
      .text('Short paragraph.')
      .build();

    const pager = new SmartPager({ maxChunkSize: 1000 });
    const pages = pager.paginate(card);

    expect(pages).toHaveLength(1);
  });

  it('should split card across blocks without breaking boundaries', () => {
    const longText1 = 'A'.repeat(600);
    const longText2 = 'B'.repeat(600);

    const card = CardBuilder.create('Large Card')
      .text(longText1)
      .text(longText2)
      .metric([{ label: 'Total', value: 100 }])
      .build();

    const pager = new SmartPager({ maxChunkSize: 800 });
    const pages = pager.paginate(card);

    expect(pages.length).toBeGreaterThan(1);
    // Footers should be attached to the last page
    const lastPage = pages[pages.length - 1];
    expect(lastPage.blocks.some((b) => b.type === 'metric_footer')).toBe(true);
  });

  it('should slice oversized code blocks gracefully', () => {
    const codeLines = Array.from({ length: 50 }, (_, i) => `console.log("line ${i}");`).join('\n');
    const card = CardBuilder.create()
      .code(codeLines, 'typescript')
      .build();

    const pager = new SmartPager({ maxChunkSize: 400 });
    const pages = pager.paginate(card);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].blocks[0].type).toBe('code');
  });
});
