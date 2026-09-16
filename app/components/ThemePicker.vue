<script setup lang="ts">
import type { ThemeName } from '#shared/constants/themes';

const { theme, definition, themes, setTheme } = useJukaTheme();
const { t } = useI18n();
const toast = useToast();

const open = ref(false);

/*
 * Grouped by mode. The mode is what someone is actually choosing between at
 * night; the cultivar is the choice within it.
 */
const groups = computed(() =>
  [
    { mode: 'light' as const, label: t('theme.light') },
    { mode: 'sepia' as const, label: t('theme.sepia') },
    { mode: 'dark' as const, label: t('theme.dark') }
  ].map((group) => ({
    ...group,
    entries: themes.filter((entry) => entry.mode === group.mode)
  }))
);

async function choose(name: ThemeName) {
  try {
    await setTheme(name);
    open.value = false;
  } catch {
    toast.add({ title: t('theme.notSaved'), icon: 'i-icon-park-outline-caution', color: 'error' });
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      color="neutral"
      variant="ghost"
      :aria-label="t('theme.title')"
      :title="`${t('theme.title')}: ${definition.label}`"
    >
      <!-- The swatch is the button: the current accent is the icon. -->
      <span class="size-4 rounded-full" :style="{ backgroundColor: definition.primary }" />
    </UButton>

    <template #content>
      <div class="w-64 p-2">
        <div v-for="group in groups" :key="group.mode" class="mb-2 last:mb-0">
          <p class="mb-1 px-2 text-xs font-medium text-dimmed">
            {{ group.label }}
          </p>
          <div class="grid grid-cols-2 gap-0.5">
            <UButton
              v-for="entry in group.entries"
              :key="entry.name"
              color="neutral"
              :variant="theme === entry.name ? 'soft' : 'ghost'"
              size="sm"
              block
              class="justify-start"
              :aria-pressed="theme === entry.name"
              :title="entry.description"
              @click="choose(entry.name)"
            >
              <span class="size-3.5 shrink-0 rounded-full" :style="{ backgroundColor: entry.primary }" />
              <span class="truncate">{{ entry.label }}</span>
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
