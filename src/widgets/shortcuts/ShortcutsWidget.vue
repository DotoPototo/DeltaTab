<template>
  <WidgetCard>
    <EmptyState v-if="!sites.length" compact icon="material-symbols:bookmark-outline-rounded" title="No shortcuts yet">
      <AppButton size="sm" label="Pin a site" @click="openSettings" />
    </EmptyState>
    <div v-else class="shortcuts">
      <ul class="sites" :class="`sites-${config.style}`">
        <li v-for="site in sites" :key="site.url" class="site-wrap">
          <ExternalLink
            v-tippy="config.style === 'icons' ? site.title : undefined"
            :href="site.url"
            :aria-label="site.title"
            class="site"
            :title="config.style === 'icons' ? undefined : site.url"
          >
            <span class="site-plate"><SiteIcon :url="site.url" :size="config.style === 'list' ? 18 : 26" /></span>
            <span v-if="config.style !== 'icons'" class="site-text">
              <span class="site-label">{{ site.title }}</span>
              <span v-if="config.style === 'list'" class="site-host">{{ hostname(site.url) }}</span>
            </span>
          </ExternalLink>
          <button v-if="!site.pinned" class="site-hide" :aria-label="`Hide ${site.title}`" @click="hide(site.url)">
            <Icon icon="material-symbols:close-rounded" />
          </button>
        </li>
        <li v-if="config.style !== 'list'" class="site-wrap">
          <button
            v-tippy="config.style === 'icons' ? 'Add a shortcut' : undefined"
            type="button"
            class="site site-add"
            aria-label="Add a shortcut"
            @click="openSettings"
          >
            <span class="site-plate"><Icon icon="material-symbols:add-rounded" /></span>
            <span v-if="config.style === 'tiles'" class="site-text"><span class="site-label">Add</span></span>
          </button>
        </li>
      </ul>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { browser } from 'wxt/browser';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ExternalLink from '@/components/base/ExternalLink.vue';
import SiteIcon from '@/components/base/SiteIcon.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { hostname } from '@/libs/text';
import { useWidget, useWidgetConfig } from '@/widgets/context';
import type { Shortcut, ShortcutsConfig } from './index';

const MAX_TITLE_LENGTH = 24;

const config = useWidgetConfig<ShortcutsConfig>();
const { openSettings } = useWidget();
const topSites = shallowRef<Shortcut[]>([]);

// The latest request wins, so one in flight can't bring "most visited" back after it's turned off.
watch(
  () => config.value.topSites,
  async (enabled, _, onCleanup) => {
    let stale = false;
    onCleanup(() => (stale = true));
    if (!enabled) return (topSites.value = []);
    try {
      const sites = await browser.topSites.get();
      if (!stale) topSites.value = sites.map((s) => ({ url: s.url, title: s.title || s.url }));
    } catch (error) {
      if (!stale) console.warn('[shortcuts] Most visited sites unavailable:', error);
    }
  },
  { immediate: true }
);

const shortTitle = (title: string) => title.split(/\s+[-\u2013\u2014|·:]\s+/)[0]!.slice(0, MAX_TITLE_LENGTH);

const sites = computed(() => {
  const pinnedUrls = new Set(config.value.pinned.map((p) => p.url));
  const hidden = new Set(config.value.hidden);
  return [
    ...config.value.pinned.map((s) => ({ ...s, pinned: true })),
    ...(config.value.topSites ? topSites.value : [])
      .filter((s) => !pinnedUrls.has(s.url) && !hidden.has(s.url))
      .map((s) => ({ ...s, title: shortTitle(s.title), pinned: false })),
  ].slice(0, config.value.max);
});

const hide = (url: string) => config.value.hidden.push(url);
</script>

<style scoped>
.shortcuts {
  container-type: size;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sites {
  display: grid;
  gap: 0.5rem;
  list-style: none;
}

.sites-tiles {
  grid-template-columns: repeat(auto-fill, minmax(clamp(76px, 17cqw, 108px), 1fr));
}

.sites-icons {
  grid-template-columns: repeat(auto-fill, minmax(clamp(48px, 11cqw, 64px), 1fr));
}

.sites-list {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.25rem;
}

@container (min-height: 260px) {
  .sites-tiles,
  .sites-icons {
    margin-block: auto;
  }
}

.site-wrap {
  position: relative;
}

.site {
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: var(--radius-lg);
  transition:
    background var(--duration-fast),
    border-color var(--duration-fast),
    transform var(--duration-fast);
}

.site:hover {
  background: var(--surface-hover);
}

.site-plate {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.8rem;
  background: color-mix(in oklab, var(--accent) 10%, var(--surface-hover));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text) 8%, transparent);
  font-size: 1.2rem;
  color: var(--text-muted);
}

.sites-tiles .site {
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem 0.3rem 0.6rem;
  border: 1px solid var(--border);
  background: var(--surface-raised);
}

.sites-tiles .site:hover,
.sites-icons .site:hover {
  transform: translateY(-2px);
}

.sites-tiles .site:hover {
  border-color: var(--accent);
}

.sites-icons .site {
  justify-content: center;
  aspect-ratio: 1;
}

.sites-list .site {
  gap: 0.65rem;
  padding: 0.4rem 0.55rem;
}

.sites-list .site-plate {
  width: 2rem;
  height: 2rem;
  border-radius: 0.6rem;
}

.site-add {
  cursor: pointer;
  color: var(--text-faint);
}

.sites-tiles .site-add {
  border-style: dashed;
  border-color: var(--border-strong);
  background: transparent;
}

.site-add .site-plate {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--border-strong);
}

.site-add:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.site-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}

.site-label {
  max-width: 100%;
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sites-tiles .site-text {
  align-items: center;
}

.sites-list .site-label {
  font-size: var(--text-sm);
  color: var(--text);
}

.site-host {
  font-size: var(--text-xs);
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-hide {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--surface-solid);
  opacity: 0;
  transition: opacity var(--duration-fast);
}

.site-wrap:hover .site-hide,
.site-hide:focus-visible {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .site {
    transition: none;
  }

  .sites-tiles .site:hover,
  .sites-icons .site:hover {
    transform: none;
  }
}
</style>
