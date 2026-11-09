import { onScopeDispose, readonly, ref, type Ref } from 'vue';
import { MINUTE, SECOND } from '@/libs/time';

type Granularity = 'second' | 'minute';

const PERIOD: Record<Granularity, number> = { second: SECOND, minute: MINUTE };

interface Ticker {
  now: Ref<number>;
  subscribers: number;
  timer?: ReturnType<typeof setTimeout>;
}

const tickers: Record<Granularity, Ticker> = {
  second: { now: ref(Date.now()), subscribers: 0 },
  minute: { now: ref(Date.now()), subscribers: 0 },
};

// Ticks just after the wall-clock boundary so minute displays flip exactly on :00.
const schedule = (unit: Granularity) => {
  const ticker = tickers[unit];
  clearTimeout(ticker.timer);
  ticker.now.value = Date.now();
  if (document.hidden) return;
  const period = PERIOD[unit];
  ticker.timer = setTimeout(() => schedule(unit), period - (Date.now() % period) + 5);
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    for (const unit of Object.keys(tickers) as Granularity[]) {
      if (tickers[unit].subscribers > 0) schedule(unit);
    }
  });
}

export const useNow = (unit: Granularity = 'minute'): Readonly<Ref<number>> => {
  const ticker = tickers[unit];
  if (ticker.subscribers++ === 0) schedule(unit);
  onScopeDispose(() => {
    if (--ticker.subscribers === 0) clearTimeout(ticker.timer);
  });
  return readonly(ticker.now);
};
