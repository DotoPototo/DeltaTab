import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';
import type { AnyWidgetDefinition, WidgetInstance } from '@/widgets/types';

export interface WidgetContext {
  instance: WidgetInstance;
  definition: AnyWidgetDefinition;
  openSettings: () => void;
}

export const WIDGET_CONTEXT: InjectionKey<WidgetContext> = Symbol('widget');

// Read `instance` and `definition` where they're used rather than destructuring: a remote update
// can replace the instance object, and a destructured copy would go stale.
export const useWidget = () => {
  const context = inject(WIDGET_CONTEXT);
  if (!context) throw new Error('useWidget() called outside a widget frame');
  return context;
};

// Store-owned reactive state: widgets mutate it in place and the store saves every change.
export const useWidgetConfig = <C extends object>(): ComputedRef<C> => {
  const context = useWidget();
  return computed(() => context.instance.config as C);
};
