import { defineWidget, lazy } from '@/widgets/types';

export default defineWidget<Record<string, never>>({
  type: 'scratchpad',
  name: 'Scratchpad',
  description: 'Quick notes and checklists in Markdown. Click to edit, tick boxes in place, keep several pads.',
  icon: 'material-symbols:sticky-note-2-outline-rounded',
  defaults: () => ({}),
  view: lazy(() => import('./ScratchpadWidget.vue')),
});
