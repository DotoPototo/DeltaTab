<template>
  <WidgetCard>
    <template #actions>
      <span v-if="status === 'error'" class="save-error" role="status">Not saved, retrying…</span>
      <div ref="tablist" class="tabs" role="tablist" aria-label="Pads" @keydown="onTabKeydown">
        <button
          v-for="pad in state.pads"
          :id="`${uid}-tab-${pad.id}`"
          :key="pad.id"
          role="tab"
          class="tab"
          :class="{ active: pad.id === active?.id }"
          :aria-selected="pad.id === active?.id"
          :aria-controls="`${uid}-panel`"
          :tabindex="pad.id === active?.id ? 0 : -1"
          @click="choose(pad.id)"
        >
          {{ titleOf(pad.content) }}
        </button>
      </div>
      <IconButton v-if="active?.content.trim() && !editing" size="sm" icon="material-symbols:edit-outline-rounded" label="Edit pad" @click="beginEditing" />
      <IconButton size="sm" icon="material-symbols:add-rounded" label="New pad" @click="newPad" />
      <IconButton v-if="active" size="sm" icon="material-symbols:delete-outline-rounded" label="Delete pad" @click="removeActive" />
    </template>

    <div v-if="active" :id="`${uid}-panel`" class="pad" role="tabpanel" :aria-labelledby="`${uid}-tab-${active.id}`" @click="onPadClick">
      <textarea
        v-if="editing || !active.content.trim()"
        ref="editor"
        class="editor"
        :value="active.content"
        placeholder="Jot something down… Markdown and - [ ] checklists work."
        aria-label="Pad text"
        spellcheck="true"
        @input="update(active.id, ($event.target as HTMLTextAreaElement).value)"
        @keydown="onKeydown"
        @blur="editing = false"
      />
      <MarkdownView
        v-else
        :source="active.content"
        class="rendered"
        tabindex="0"
        aria-description="Press Enter to edit"
        @toggle="toggle"
        @keydown.enter.self.prevent="beginEditing"
      />
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef } from 'vue';
import IconButton from '@/components/base/IconButton.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useToast } from '@/composables/useToast';
import { continueList, titleOf, toggleTask } from './markdown';
import MarkdownView from './MarkdownView';
import { usePads } from './pads';

const { state, status, active, select, add, remove, update } = usePads();
const uid = useId();
const tablist = useTemplateRef('tablist');
const toast = useToast();
const editing = ref(false);
const editor = useTemplateRef('editor');

const focusEditor = async (atEnd = true) => {
  await nextTick();
  const el = editor.value;
  if (!el) return;
  el.focus();
  if (atEnd) el.setSelectionRange(el.value.length, el.value.length);
};

const beginEditing = () => {
  if (editing.value) return;
  editing.value = true;
  focusEditor();
};

const onPadClick = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('a, input, label')) return;
  beginEditing();
};

const choose = (id: string) => {
  select(id);
  editing.value = false;
};

const onTabKeydown = async (event: KeyboardEvent) => {
  const ids = state.value.pads.map((p) => p.id);
  const index = ids.indexOf(active.value?.id ?? '');
  const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: ids.length - 1 }[event.key];
  if (target === undefined) return;
  event.preventDefault();
  choose(ids[(target + ids.length) % ids.length]!);
  await nextTick();
  tablist.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
};

const newPad = () => {
  add();
  editing.value = true;
  focusEditor();
};

const removeActive = () => {
  const pad = active.value;
  if (!pad) return;
  const undo = remove(pad.id);
  if (undo && pad.content.trim()) toast.add({ summary: `Deleted “${titleOf(pad.content)}”`, action: { label: 'Undo', run: undo } });
};

const toggle = (line: number) => active.value && update(active.value.id, toggleTask(active.value.content, line));

const onKeydown = (event: KeyboardEvent) => {
  const el = event.target as HTMLTextAreaElement;
  if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
    event.preventDefault();
    el.blur();
    return;
  }
  if (event.key !== 'Enter' || event.shiftKey || el.selectionStart !== el.selectionEnd) return;

  const { value, selectionStart: caret } = el;
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  const result = continueList(value.slice(lineStart, caret));
  if (!result) return;
  event.preventDefault();
  // execCommand keeps the native undo stack intact, unlike assigning el.value.
  if ('clear' in result) {
    el.setSelectionRange(lineStart, caret);
    document.execCommand('delete');
  } else {
    document.execCommand('insertText', false, `\n${result.prefix}`);
  }
};
</script>

<style scoped>
.save-error {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--danger);
}

.tabs {
  display: flex;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab {
  flex-shrink: 0;
  max-width: 9rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-xs);
  font-size: var(--text-xs);
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  background: var(--surface-hover);
  color: var(--text);
}

.pad {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  cursor: text;
}

.editor {
  flex: 1;
  width: 100%;
  min-height: 6rem;
  padding: 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.editor::placeholder {
  color: var(--text-faint);
}

.rendered {
  font-size: var(--text-sm);
  line-height: 1.6;
}

.rendered :deep(.md-heading) {
  margin: 0.2rem 0 0.3rem;
  font-size: 1.05em;
  font-weight: 700;
}

.rendered :deep(h4.md-heading) {
  font-size: 0.95em;
}

.rendered :deep(h5.md-heading) {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.rendered :deep(.md-task) {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.rendered :deep(.md-task input) {
  flex-shrink: 0;
  width: 0.95rem;
  height: 0.95rem;
  margin-top: 0.3em;
  accent-color: var(--accent);
  cursor: pointer;
}

.rendered :deep(.md-task.done span) {
  color: var(--text-faint);
  text-decoration: line-through;
}

.rendered :deep(.md-item) {
  display: flex;
  gap: 0.5rem;
}

.rendered :deep(.md-marker) {
  flex-shrink: 0;
  min-width: 0.9rem;
  color: var(--text-faint);
}

.rendered :deep(.md-quote) {
  padding-left: 0.6rem;
  border-left: 2px solid var(--border-strong);
  color: var(--text-muted);
}

.rendered :deep(.md-code) {
  margin: 0.3rem 0;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-xs);
  background: var(--surface-sunken);
  overflow-x: auto;
}

.rendered :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.rendered :deep(p code),
.rendered :deep(span code) {
  padding: 0.05em 0.3em;
  border-radius: var(--radius-xs);
  background: var(--surface-sunken);
}

.rendered :deep(.md-link) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--accent) 40%, transparent);
  text-underline-offset: 2px;
}

.rendered :deep(.md-rule) {
  margin: 0.5rem 0;
  border: none;
  border-top: 1px solid var(--border);
}

.rendered :deep(.md-blank) {
  height: 0.6rem;
}
</style>
