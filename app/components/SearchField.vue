<script setup lang="ts">
import type { CardFilters } from '~/composables/useCardFilters';

/**
 * The one search box, shared by the sidebar on wide screens and the top bar on a phone.
 *
 * Debounced into the shared filters, so every page that shows cards narrows as you type without a request per key.
 * Drawn as an underline rather than a box, and the underline turning to the accent is the focus indicator: the global ring would only draw a second, orange box around it.
 */
const { t } = useI18n();

const filters = useState<CardFilters>('juka:filters');
const search = ref(filters.value?.q ?? '');
let timer: ReturnType<typeof setTimeout> | undefined;

watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    filters.value = { ...filters.value, q: value };
  }, 180);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <UInput
    v-model="search"
    icon="i-lucide-search"
    size="lg"
    variant="none"
    :ui="{
      root: 'border-b-2 border-(--ui-text-highlighted) transition-colors focus-within:border-primary',
      base: 'focus-visible:outline-none lg:h-11 lg:text-lg'
    }"
    :placeholder="t('cards.searchPlaceholder')"
    :aria-label="t('cards.searchPlaceholder')"
  >
    <template v-if="search" #trailing>
      <UButton icon="i-lucide-x" color="neutral" variant="link" :aria-label="t('common.clear')" @click="search = ''" />
    </template>
  </UInput>
</template>
