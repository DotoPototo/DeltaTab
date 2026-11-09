import { describe, test, expect } from 'bun:test';
import { continueList, parseBlocks, parseInline, titleOf, toggleTask } from '@/widgets/scratchpad/markdown';

describe('parseInline', () => {
  test('code, bold, italic, strike, links and bare urls', () => {
    expect(parseInline('a `b` **c** *d* ~~e~~ [f](https://f.dev) https://www.g.dev/x.')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'code', text: 'b' },
      { type: 'text', text: ' ' },
      { type: 'strong', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'd' }] },
      { type: 'text', text: ' ' },
      { type: 'strike', children: [{ type: 'text', text: 'e' }] },
      { type: 'text', text: ' ' },
      { type: 'link', href: 'https://f.dev', children: [{ type: 'text', text: 'f' }] },
      { type: 'text', text: ' ' },
      { type: 'link', href: 'https://www.g.dev/x', children: [{ type: 'text', text: 'g.dev/x' }] },
      { type: 'text', text: '.' },
    ]);
  });

  test('never produces javascript: links', () => {
    expect(parseInline('[x](javascript:alert(1))').every((n) => n.type !== 'link')).toBe(true);
  });
});

describe('parseBlocks', () => {
  test('recognises block types and keeps task line numbers', () => {
    const blocks = parseBlocks(['# Title', '- [ ] todo', '- [x] done', '- item', '1. first', '> quote', '---', '', '```', 'code', '```', 'text'].join('\n'));
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'task', 'task', 'bullet', 'ordered', 'quote', 'rule', 'blank', 'code', 'paragraph']);
    expect(blocks[2]).toMatchObject({ type: 'task', checked: true, line: 2 });
    expect(blocks[8]).toEqual({ type: 'code', text: 'code' });
  });
});

describe('toggleTask', () => {
  test('flips only the targeted line', () => {
    const source = '- [ ] a\n- [x] b';
    expect(toggleTask(source, 0)).toBe('- [x] a\n- [x] b');
    expect(toggleTask(source, 1)).toBe('- [ ] a\n- [ ] b');
    expect(toggleTask(source, 9)).toBe(source);
  });
});

describe('continueList', () => {
  test('continues tasks unchecked, increments numbers, keeps indentation', () => {
    expect(continueList('- [x] done')).toEqual({ prefix: '- [ ] ' });
    expect(continueList('  - item')).toEqual({ prefix: '  - ' });
    expect(continueList('9. nine')).toEqual({ prefix: '10. ' });
  });

  test('empty items end the list; plain text does nothing', () => {
    expect(continueList('- [ ] ')).toEqual({ clear: true });
    expect(continueList('- ')).toEqual({ clear: true });
    expect(continueList('hello')).toBeNull();
  });
});

describe('titleOf', () => {
  test('first meaningful line without markdown', () => {
    expect(titleOf('\n# **Groceries**\n- milk')).toBe('Groceries');
    expect(titleOf('- [ ] call mum')).toBe('call mum');
    expect(titleOf('   ')).toBe('Untitled');
  });
});
