const now = Date.now();
const ago = (minutes: number) => now - minutes * 60_000;

export const SAMPLE_HISTORY = [
  {
    url: 'https://github.com/vuejs/core/pull/12345',
    title: 'fix(reactivity): avoid stale computed by evan · Pull Request #12345 · vuejs/core',
    lastVisitTime: ago(12),
    visitCount: 6,
  },
  {
    url: 'https://github.com/vuejs/core/issues/12001',
    title: 'Transition flicker on keyed swap · Issue #12001 · vuejs/core',
    lastVisitTime: ago(55),
    visitCount: 3,
  },
  { url: 'https://github.com/oven-sh/bun', title: 'oven-sh/bun: Incredibly fast JavaScript runtime', lastVisitTime: ago(140), visitCount: 9 },
  {
    url: 'https://github.com/wxt-dev/wxt/pull/1500',
    title: 'feat: optional host permissions by aklinker1 · Pull Request #1500 · wxt-dev/wxt',
    lastVisitTime: ago(300),
    visitCount: 2,
  },
  {
    url: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster',
    title: 'java, c++ - Why is processing a sorted array faster than an unsorted array? - Stack Overflow',
    lastVisitTime: ago(800),
    visitCount: 1,
  },
  { url: 'https://www.npmjs.com/package/vue', title: 'vue - npm', lastVisitTime: ago(1500), visitCount: 2 },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/API/URLPattern', title: 'URLPattern - Web APIs | MDN', lastVisitTime: ago(2900), visitCount: 4 },
];

export const SAMPLE_TOP_SITES = [
  { url: 'https://github.com/', title: 'GitHub' },
  { url: 'https://news.ycombinator.com/', title: 'Hacker News' },
  { url: 'https://www.youtube.com/', title: 'YouTube' },
  { url: 'https://developer.mozilla.org/', title: 'MDN Web Docs' },
  { url: 'https://vercel.com/', title: 'Vercel' },
  { url: 'https://www.figma.com/', title: 'Figma' },
];
