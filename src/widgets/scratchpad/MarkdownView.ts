import { defineComponent, h, type VNode } from 'vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import { parseBlocks, type Block, type Inline } from './markdown';

const renderInline = (nodes: Inline[]): (VNode | string)[] =>
  nodes.map((node) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'code':
        return h('code', node.text);
      case 'strong':
        return h('strong', renderInline(node.children));
      case 'em':
        return h('em', renderInline(node.children));
      case 'strike':
        return h('s', renderInline(node.children));
      case 'link':
        return h(ExternalLink, { href: node.href, class: 'md-link' }, () => renderInline(node.children));
    }
  });

export default defineComponent({
  name: 'MarkdownView',
  props: { source: { type: String, required: true } },
  emits: { toggle: (line: number) => Number.isInteger(line) },
  setup(props, { emit }) {
    const renderBlock = (block: Block, index: number): VNode => {
      switch (block.type) {
        case 'heading':
          return h(`h${block.level + 2}`, { class: 'md-heading', key: index }, renderInline(block.content));
        case 'task':
          return h('label', { class: ['md-task', { done: block.checked }], key: index, onClick: (e: MouseEvent) => e.stopPropagation() }, [
            h('input', { type: 'checkbox', checked: block.checked, onChange: () => emit('toggle', block.line) }),
            h('span', renderInline(block.content)),
          ]);
        case 'bullet':
        case 'ordered':
          return h('div', { class: 'md-item', key: index }, [
            h('span', { class: 'md-marker' }, block.type === 'bullet' ? '•' : block.marker),
            h('span', renderInline(block.content)),
          ]);
        case 'quote':
          return h('blockquote', { class: 'md-quote', key: index }, renderInline(block.content));
        case 'code':
          return h('pre', { class: 'md-code', key: index }, h('code', block.text));
        case 'rule':
          return h('hr', { class: 'md-rule', key: index });
        case 'blank':
          return h('div', { class: 'md-blank', key: index });
        case 'paragraph':
          return h('p', { class: 'md-paragraph', key: index }, renderInline(block.content));
      }
    };
    return () => h('div', { class: 'md' }, parseBlocks(props.source).map(renderBlock));
  },
});
