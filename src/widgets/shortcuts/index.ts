import { defineWidget, lazy } from '@/widgets/types';

export interface Shortcut {
  url: string;
  title: string;
}

export interface ShortcutsConfig {
  topSites: boolean;
  pinned: Shortcut[];
  hidden: string[];
  max: number;
  style: 'tiles' | 'icons' | 'list';
}

export default defineWidget<ShortcutsConfig>({
  type: 'shortcuts',
  name: 'Shortcuts',
  description: 'Your pinned sites plus the ones you visit most, with icons from the browser’s own cache.',
  icon: 'material-symbols:bookmark-outline-rounded',
  defaults: () => ({ topSites: true, pinned: [], hidden: [], max: 12, style: 'tiles' }),
  view: lazy(() => import('./ShortcutsWidget.vue')),
  settings: lazy(() => import('./ShortcutsSettings.vue')),
  permissions: (config) => ({ permissions: config.topSites ? ['topSites'] : [] }),
  permissionReason: 'Shows the sites you visit most, read locally from your browser.',
});
