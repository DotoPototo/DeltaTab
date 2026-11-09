import { describe, test, expect, beforeEach } from 'bun:test';
import { useToast } from '@/composables/useToast';

const drain = () => {
  const { messages, dismiss } = useToast();
  while (messages.value.length > 0) dismiss(messages.value[0]!.id);
};

describe('useToast', () => {
  beforeEach(() => {
    drain();
  });

  test('add() appends a message and returns its id', () => {
    const { add, messages } = useToast();
    const id = add({ summary: 'hello' });
    expect(messages.value).toHaveLength(1);
    expect(messages.value[0]?.id).toBe(id);
    expect(messages.value[0]?.summary).toBe('hello');
  });

  test('defaults severity to info when omitted', () => {
    const { add, messages } = useToast();
    add({ summary: 'no severity' });
    expect(messages.value[0]?.severity).toBe('info');
  });

  test('shortcut helpers tag the right severity', () => {
    const { info, success, warn, error, messages } = useToast();
    info('i');
    success('s');
    warn('w');
    error('e');
    expect(messages.value.map((m) => m.severity)).toEqual(['info', 'success', 'warn', 'error']);
  });

  test('default lifetimes scale with severity', () => {
    const { info, success, warn, error, messages } = useToast();
    info('i');
    success('s');
    warn('w');
    error('e');
    const lives = messages.value.map((m) => m.life);
    expect(lives).toEqual([6000, 5000, 8000, 10000]);
  });

  test('explicit life overrides the per-severity default', () => {
    const { add, messages } = useToast();
    add({ severity: 'error', summary: 'sticky', life: 0 });
    expect(messages.value[0]?.life).toBe(0);
  });

  test('dismiss removes the targeted message and leaves others', () => {
    const { add, dismiss, messages } = useToast();
    const id1 = add({ summary: 'one' });
    const id2 = add({ summary: 'two' });
    dismiss(id1);
    expect(messages.value).toHaveLength(1);
    expect(messages.value[0]?.id).toBe(id2);
  });

  test('messages auto-dismiss after their life elapses', async () => {
    const { add, messages } = useToast();
    add({ summary: 'short', life: 30 });
    expect(messages.value).toHaveLength(1);
    await Bun.sleep(80);
    expect(messages.value).toHaveLength(0);
  });

  test('life: 0 disables auto-dismiss', async () => {
    const { add, messages } = useToast();
    add({ summary: 'sticky', life: 0 });
    await Bun.sleep(50);
    expect(messages.value).toHaveLength(1);
  });
});
