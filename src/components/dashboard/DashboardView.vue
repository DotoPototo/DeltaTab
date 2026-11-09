<template>
  <!-- Always in the DOM so even the first open slides in; widgets mount on first open or hover, then stay alive. -->
  <section ref="sheet" class="dashboard" :class="{ visible: open, dragging: dragY !== null, peek: !open && hovered }" :style="dragStyle" aria-label="Dashboard">
    <div ref="sheetBody" class="sheet" :inert="!open" tabindex="-1">
      <header class="topbar" :class="{ editing }">
        <div class="topbar-time">
          <span class="topbar-clock tabular">{{ clock }}</span>
          <span class="topbar-date">{{ date }}</span>
        </div>
        <div class="topbar-actions">
          <template v-if="editing">
            <span v-if="hiddenWidgets.length" v-tippy="hiddenHint" class="hidden-note" tabindex="0" :aria-label="hiddenHint">
              {{ hiddenWidgets.length }} hidden
            </span>
            <div class="presets">
              <SegmentedControl
                :model-value="layout.preset"
                size="sm"
                label="Layout"
                :options="PRESETS.map((p) => ({ value: p.id, label: p.label }))"
                @update:model-value="dashboard.setPreset"
              />
            </div>
            <AppButton size="sm" variant="ghost" label="Reset sizes" @click="dashboard.resetSizes" />
            <AppButton
              v-tippy="'Puts the layout back. Widget settings changed meanwhile are kept.'"
              size="sm"
              variant="ghost"
              label="Cancel"
              @click="dashboard.cancelEdit"
            />
            <AppButton ref="doneButton" size="sm" variant="primary" icon="material-symbols:check-rounded" label="Done" @click="dashboard.commitEdit" />
          </template>
          <template v-else>
            <IconButton ref="editButton" icon="material-symbols:edit-outline-rounded" label="Edit layout" placement="bottom" @click="dashboard.beginEdit" />
            <IconButton icon="fa-solid:cog" label="Settings" placement="bottom" @click="openSettings()" />
            <IconButton icon="fa-solid:chevron-up" label="Close (Esc)" placement="bottom" @click="toggle" />
          </template>
        </div>
      </header>

      <main class="dashboard-body">
        <DashboardLayout v-if="mounted" :editing="editing" @settings="configure" @pick="pick" />
      </main>
    </div>
    <button
      ref="handle"
      class="handle"
      :class="{ hovered, pressed, away }"
      :aria-label="open ? 'Close dashboard' : 'Open dashboard (Ctrl+Space)'"
      :aria-expanded="open"
      @pointerenter="onHandlePointer"
      @pointermove="onHandlePointer"
      @pointerleave="hovering = false"
      @pointerdown="startDrag"
      @click="onHandleClick"
    >
      <Icon icon="fa-solid:chevron-down" class="handle-icon" />
    </button>

    <WidgetPicker v-model:open="pickerOpen" :target="pickTarget" />
    <WidgetSettingsDialog v-model:open="widgetSettingsOpen" :instance-id="configuringId" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import IconButton from '@/components/base/IconButton.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import DashboardLayout from '@/components/dashboard/DashboardLayout.vue';
import WidgetPicker from '@/components/dashboard/WidgetPicker.vue';
import WidgetSettingsDialog from '@/components/dashboard/WidgetSettingsDialog.vue';
import { openModals } from '@/composables/useModals';
import { useShell } from '@/composables/useShell';
import { useNow } from '@/composables/useNow';
import { useToast } from '@/composables/useToast';
import { joinList } from '@/libs/text';
import { dateFormat, formatTime } from '@/libs/time';
import { PRESETS, useDashboardStore, type SlotRef } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';
import { widgetDefinition } from '@/widgets';

const { open, toggle, openSettings } = useShell();
const dashboard = useDashboardStore();
const toast = useToast();
const { layout, editing } = storeToRefs(dashboard);
const { hour12 } = storeToRefs(useSettingsStore());
const now = useNow();

const mounted = ref(open.value);

const hiddenWidgets = computed(() => layout.value.overflow.map((id) => dashboard.find(id)).filter((i) => !!i));
const hiddenHint = computed(
  () =>
    `Not in this layout: ${joinList(hiddenWidgets.value.map((i) => i.title?.trim() || widgetDefinition(i.type)?.name || i.type))}. Add one to an empty slot to bring it back with its settings.`
);
// Entering edit mode is the cue that widget settings are about to be opened: fetch their code now.
watch(editing, (value) => {
  if (value) for (const instance of dashboard.placed) widgetDefinition(instance.type)?.settings?.prefetch();
});

watch(open, (value) => {
  if (value) mounted.value = true;
  // Closing the dashboard mid-edit keeps the changes, like pressing Done.
  else if (editing.value) dashboard.commitEdit();
});

// Focus follows the sheet, leaving an open dialog alone; Edit and Done replace each other, so focus
// is handed between them.
const sheetBody = useTemplateRef<HTMLElement>('sheetBody');
const handle = useTemplateRef<HTMLElement>('handle');
const editButton = useTemplateRef<{ $el: HTMLElement }>('editButton');
const doneButton = useTemplateRef<{ $el: HTMLElement }>('doneButton');

watch(open, async (value) => {
  if (openModals.value.length) return;
  const focused = document.activeElement;
  if (value && (focused === handle.value || focused === document.body)) {
    await nextTick();
    sheetBody.value?.focus({ preventScroll: true });
  } else if (!value && sheetBody.value?.contains(focused)) handle.value?.focus({ preventScroll: true });
});

watch(editing, async (value) => {
  const focused = document.activeElement;
  if (openModals.value.length || !(focused === document.body || sheetBody.value?.querySelector('.topbar')?.contains(focused))) return;
  await nextTick();
  (value ? doneButton : editButton).value?.$el.focus();
});

const HANDLE_HEIGHT = 24;
const DRAG_THRESHOLD = 4;
const FLICK_VELOCITY = 0.5; // px per ms
const sheet = useTemplateRef('sheet');
const dragY = ref<number | null>(null);
const dragStyle = computed(() => (dragY.value === null ? undefined : { transform: `translateY(${dragY.value}px)` }));

let suppressClick = false;

// Tracked by hand, not :hover: a browser only rechecks :hover when the pointer moves, so a sheet
// sliding away would keep peeking. `away` keeps a plain cursor until the pointer really moves.
const hovering = ref(false);
const pressed = ref(false);
const away = ref(false);
const hovered = computed(() => hovering.value && !away.value);

const onHandlePointer = (event: PointerEvent) => {
  mounted.value = true;
  if (event.pointerType === 'touch' || pressed.value) return;
  hovering.value = true;
  away.value = false;
};

const leaveHandle = () => {
  hovering.value = false;
  away.value = true;
};

watch(open, leaveHandle);

const onHandleClick = () => {
  // The click that ends a drag has already been handled by the drag itself.
  if (suppressClick) suppressClick = false;
  else toggle();
};

const startDrag = (event: PointerEvent) => {
  mounted.value = true;
  // A previous drag may have ended without a click (released off-screen).
  suppressClick = false;
  const element = event.currentTarget as HTMLElement;
  const closedY = -((sheet.value?.offsetHeight ?? window.innerHeight) - HANDLE_HEIGHT);
  const startY = event.clientY;
  const base = open.value ? 0 : closedY;
  let last = { y: startY, t: event.timeStamp };
  let velocity = 0;
  let moved = false;
  element.setPointerCapture(event.pointerId);
  pressed.value = true;

  const move = (e: PointerEvent) => {
    if (Math.abs(e.clientY - startY) > DRAG_THRESHOLD) moved = true;
    if (!moved) return;
    dragY.value = Math.min(0, Math.max(closedY, base + e.clientY - startY));
    velocity = (e.clientY - last.y) / Math.max(1, e.timeStamp - last.t);
    last = { y: e.clientY, t: e.timeStamp };
  };
  const end = () => {
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end);
    pressed.value = false;
    if (!moved) return;
    suppressClick = true;
    const progress = 1 - (dragY.value ?? base) / closedY;
    let shouldOpen = progress > 0.5;
    if (Math.abs(velocity) > FLICK_VELOCITY) shouldOpen = velocity > 0;
    open.value = shouldOpen;
    // Releasing the inline transform lets the CSS transition carry on from where the finger left off.
    dragY.value = null;
    leaveHandle();
  };
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
};

const pickerOpen = ref(false);
const pickTarget = ref<SlotRef>();
const widgetSettingsOpen = ref(false);
const configuringId = ref<string>();

const clock = computed(() => formatTime(now.value, hour12.value));
const date = computed(() => dateFormat({ weekday: 'long', day: 'numeric', month: 'long' }).format(now.value));

const configure = toast.attempt('Couldn’t open its settings', async (id: string) => {
  // Open once the settings code is loaded (instant if preloaded), so the dialog never appears empty.
  await widgetDefinition(dashboard.find(id)?.type ?? '')?.settings?.preload();
  configuringId.value = id;
  widgetSettingsOpen.value = true;
});

const pick = (slot: SlotRef) => {
  pickTarget.value = slot;
  pickerOpen.value = true;
};
</script>

<style scoped>
.dashboard {
  --handle: 24px;
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  background: var(--scrim);
  backdrop-filter: blur(var(--blur));
  transform: translateY(calc(-100% + var(--handle)));
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.dashboard.peek {
  transform: translateY(calc(-100% + var(--handle) + 14px));
}

.dashboard.visible {
  transform: translateY(0);
}

.dashboard.dragging {
  transition: none;
}

.hidden-note {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px dashed var(--border-strong);
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  cursor: help;
}

.hidden-note:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sheet:focus {
  /* Focused only to hand keyboard users the next Tab; the controls show their own focus. */
  outline: none;
}

.sheet {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.handle {
  position: relative;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: var(--handle);
  border-bottom: 2px solid var(--accent);
  color: var(--accent);
  font-size: 1.1rem;
  cursor: grab;
  transition:
    border-color 0.6s var(--ease-in-out),
    color 0.6s var(--ease-in-out);
}

.handle.hovered .handle-icon {
  color: var(--accent-strong);
}

/* Extends the hit area above the handle so the hover "peek" never slides it out from under the cursor. */
.handle::before {
  content: '';
  position: absolute;
  inset: -24px 0 0;
}

.handle.pressed {
  cursor: grabbing;
}

.handle.away {
  cursor: default;
}

.handle-icon {
  transition: transform 0.4s var(--ease-out);
}

.visible .handle-icon {
  transform: rotate(180deg);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 3.25rem;
  padding: 0 1rem 0 1.25rem;
  flex-shrink: 0;
}

.topbar-time {
  display: flex;
  /* Centred, not baseline: beside big numerals (no descenders) a small baseline-aligned date looks sunk. */
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.topbar-clock {
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1;
  color: var(--accent);
}

.topbar-date {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

/* Done and Cancel must never be pushed off screen; the preset picker gives way (scrolling) first. */
.topbar-actions > :deep(.btn) {
  flex-shrink: 0;
}

.presets {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

@media (max-width: 760px) {
  .topbar-date {
    display: none;
  }
}

@media (max-width: 1000px) {
  .topbar.editing .topbar-time {
    display: none;
  }

  .topbar.editing {
    justify-content: flex-end;
  }
}

.dashboard-body {
  flex: 1;
  min-height: 0;
  padding: 0 1rem 1rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    overflow-y: auto;
  }
}
</style>
