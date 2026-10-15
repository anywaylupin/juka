<script setup lang="ts">
import type { CardFilters } from '~/composables/useCardFilters';

/**
 * The one search box, shared by the sidebar on wide screens and the top bar on a phone.
 *
 * Debounced into the shared filters, so every page that shows cards narrows as you type without a request per key.
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
    class="juka-search"
    :placeholder="t('cards.searchPlaceholder')"
    :aria-label="t('cards.searchPlaceholder')"
  >
    <template v-if="search" #trailing>
      <UButton icon="i-lucide-x" color="neutral" variant="link" :aria-label="t('common.clear')" @click="search = ''" />
    </template>
  </UInput>
</template>
