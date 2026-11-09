// A deliberately small Markdown subset. Parsing produces plain data rather than HTML strings, so
// rendering can never inject markup.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong' | 'em' | 'strike'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; content: Inline[] }
  | { type: 'task'; checked: boolean; line: number; content: Inline[] }
  | { type: 'bullet' | 'ordered'; marker: string; content: Inline[] }
  | { type: 'quote' | 'paragraph'; content: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'rule' | 'blank' };

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])/g;

export const parseInline = (text: string): Inline[] => {
  const result: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index!;
    if (index > last) result.push({ type: 'text', text: text.slice(last, index) });
    const [whole, code, strong, strike, em, linkText, linkHref, bare] = match;
    if (code) result.push({ type: 'code', text: code.slice(1, -1) });
    else if (strong) result.push({ type: 'strong', children: parseInline(strong.slice(2, -2)) });
    else if (strike) result.push({ type: 'strike', children: parseInline(strike.slice(2, -2)) });
    else if (em) result.push({ type: 'em', children: parseInline(em.slice(1, -1)) });
    else if (linkText && linkHref) result.push({ type: 'link', href: linkHref, children: parseInline(linkText) });
    else if (bare) result.push({ type: 'link', href: bare, children: [{ type: 'text', text: bare.replace(/^https?:\/\/(www\.)?/, '') }] });
    last = index + whole.length;
  }
  if (last < text.length) result.push({ type: 'text', text: text.slice(last) });
  return result;
};

const TASK = /^(\s*)[-*] \[( |x|X)\] ?(.*)$/;
const BULLET = /^(\s*)([-*+]) (.*)$/;
const ORDERED = /^(\s*)(\d+)[.)] (.*)$/;

export const parseBlocks = (source: string): Block[] => {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpMatchArray | null;
    if (line.startsWith('```')) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i]!);
      blocks.push({ type: 'code', text: code.join('\n') });
    } else if ((match = line.match(/^(#{1,3}) (.*)$/))) {
      blocks.push({ type: 'heading', level: match[1]!.length as 1 | 2 | 3, content: parseInline(match[2]!) });
    } else if ((match = line.match(TASK))) {
      blocks.push({ type: 'task', checked: match[2] !== ' ', line: i, content: parseInline(match[3]!) });
    } else if ((match = line.match(BULLET))) {
      blocks.push({ type: 'bullet', marker: match[2]!, content: parseInline(match[3]!) });
    } else if ((match = line.match(ORDERED))) {
      blocks.push({ type: 'ordered', marker: `${match[2]}.`, content: parseInline(match[3]!) });
    } else if (line.startsWith('> ')) {
      blocks.push({ type: 'quote', content: parseInline(line.slice(2)) });
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ type: 'rule' });
    } else if (!line.trim()) {
      blocks.push({ type: 'blank' });
    } else {
      blocks.push({ type: 'paragraph', content: parseInline(line) });
    }
  }
  return blocks;
};

export const toggleTask = (source: string, line: number): string => {
  const lines = source.split('\n');
  const target = lines[line];
  if (target === undefined) return source;
  lines[line] = target.replace(/\[( |x|X)\]/, (_, mark: string) => (mark === ' ' ? '[x]' : '[ ]'));
  return lines.join('\n');
};

export const continueList = (line: string): { prefix: string } | { clear: true } | null => {
  const task = line.match(/^(\s*[-*] )\[[ xX]\] ?(.*)$/);
  if (task) return task[2] ? { prefix: `${task[1]}[ ] ` } : { clear: true };
  const ordered = line.match(ORDERED);
  if (ordered) return ordered[3] ? { prefix: `${ordered[1]}${Number(ordered[2]) + 1}. ` } : { clear: true };
  const bullet = line.match(BULLET);
  if (bullet) return bullet[3] ? { prefix: `${bullet[1]}${bullet[2]} ` } : { clear: true };
  return null;
};

const TITLE_LENGTH = 40;

export const titleOf = (source: string) =>
  source
    .split('\n')
    .map((l) =>
      l
        .replace(/^(#{1,3} |[-*+] (\[[ xX]\] )?|\d+[.)] |> )/, '')
        .replace(/[*_`~]/g, '')
        .trim()
    )
    .find(Boolean)
    ?.slice(0, TITLE_LENGTH) ?? 'Untitled';
