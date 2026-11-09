import { describe, test, expect } from 'bun:test';
import { hasConsent, ready, requestConsent, revokeConsent } from '@/libs/dataConsent';

// Browsers without built-in data consent, such as Chrome.
describe('data consent', () => {
  test('is per feature', async () => {
    await ready;
    expect(hasConsent('weather')).toBe(false);
    expect(hasConsent()).toBe(true); // a feature that sends nothing needs nothing
    expect(await requestConsent('weather')).toBe(true);
    expect(hasConsent('weather')).toBe(true);
    expect(hasConsent('calendar')).toBe(false);
    expect(hasConsent('github')).toBe(false);
    expect(await requestConsent('calendar')).toBe(true);
    await revokeConsent('weather');
    expect(hasConsent('weather')).toBe(false);
    expect(hasConsent('calendar')).toBe(true); // withdrawing one leaves the other alone
  });

  test('a grant racing a withdrawal never brings the withdrawn consent back', async () => {
    await ready;
    expect(await requestConsent('github')).toBe(true);
    await Promise.all([requestConsent('weather'), revokeConsent('github')]);
    expect(hasConsent('github')).toBe(false);
    expect(hasConsent('weather')).toBe(true);
    await revokeConsent('weather');
  });
});
