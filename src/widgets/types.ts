import { defineAsyncComponent, type Component } from 'vue';
import type { PermissionSpec } from '@/composables/usePermissions';
import type { IconName } from '@/libs/icons';

export interface WidgetDefinition<C extends object = object> {
  type: string;
  name: string;
  description: string;
  icon: IconName;
  defaults: () => C;
  view: LazyComponent;
  settings?: LazyComponent;
  glance?: LazyComponent;
  /** Method syntax keeps the parameter bivariant, so a definition fits `AnyWidgetDefinition`. */
  permissions?(config: C): PermissionSpec;
  permissionReason?: string;
}

export type AnyWidgetDefinition = WidgetDefinition<object>;

export interface WidgetInstance<C extends object = Record<string, unknown>> {
  id: string;
  type: string;
  title?: string;
  glance: boolean;
  config: C;
}

export const defineWidget = <C extends object>(definition: WidgetDefinition<C>) => definition;

// `resolved` renders synchronously once loaded, skipping the async wrapper's empty frame.
// `prefetch` failures are ignored; the real open retries.
export type LazyComponent = Component & { preload: () => Promise<unknown>; prefetch: () => void; readonly resolved?: Component };

type Loader = () => Promise<{ default: Component }>;

export const lazy = (loader: Loader): LazyComponent => {
  let loading: ReturnType<Loader> | undefined;
  let resolved: Component | undefined;
  // One shared request for preload() and first render; a failure isn't cached.
  const preload = () =>
    (loading ??= loader().then(
      (module) => {
        resolved = module.default;
        return module;
      },
      (error) => {
        loading = undefined;
        throw error;
      }
    ));
  const component = defineAsyncComponent({
    loader: preload,
    // Vue keeps a failed load until retried: retry a transient failure twice before showing it.
    onError: (_error, retry, fail, attempts) => (attempts <= 2 ? setTimeout(retry, 300 * attempts) : fail()),
  });
  return Object.defineProperties(component, {
    preload: { value: preload },
    prefetch: { value: () => void preload().catch(() => undefined) },
    resolved: { get: () => resolved },
  }) as LazyComponent;
};
