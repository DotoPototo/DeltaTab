import { onScopeDispose } from 'vue';

export const useEventListener = <E extends Event>(target: EventTarget, type: string, handler: (event: E) => void, options?: AddEventListenerOptions) => {
  const listener = handler as EventListener;
  target.addEventListener(type, listener, options);
  onScopeDispose(() => target.removeEventListener(type, listener, options));
};
