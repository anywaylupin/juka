<script setup lang="ts">
import { MAX_RATING_LABEL, RATING_ICON, RATING_VALUES } from '#shared/constants/rating';

/**
 * Renaming the five rating levels.
 *
 * The defaults are new, difficult, hesitant, good and mastered, which is a scale about recall.
 * Someone drilling for an exam might want confident and shaky instead, and someone else might want nothing but numbers.
 * The scale is theirs, so the words are too.
 *
 * Clearing a box restores that level's default rather than leaving a nameless chip, so there is no way to end up with a rating that cannot be described.
 */
const { t } = useI18n();
const toast = useToast();
const { labels, customised, save } = useRatingLabels();

const draft = ref<string[]>([...labels.value]);
const busy = ref(false);

watch(labels, (value) => {
  draft.value = [...value];
});

const dirty = computed(() => draft.value.some((value, index) => value !== labels.value[index]));

async function commit() {
  busy.value = true;
  try {
    await save(draft.value);
    toast.add({ title: t('rating.saved'), icon: 'i-lucide-check', color: 'success' });
  } catch {
    toast.add({ title: t('rating.notSaved'), icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    busy.value = false;
  }
}

async function reset() {
  busy.value = true;
  try {
    await save(null);
  } catch {
    toast.add({ title: t('rating.notSaved'), icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      {{ t('rating.settingsHint') }}
    </p>

    <div class="space-y-2">
      <div v-for="value in RATING_VALUES" :key="value" class="flex items-center gap-3">
        <!-- The mandarins, so it is obvious which level is being renamed. -->
        <div class="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          <UIcon
            v-for="pip in RATING_VALUES"
            :key="pip"
            :name="RATING_ICON"
            class="size-3.5"
            :class="pip <= value ? 'text-[var(--color-rating)]' : 'text-muted opacity-25'"
          />
        </div>

        <UInput
          v-model="draft[value]"
          size="sm"
          class="flex-1"
          :maxlength="MAX_RATING_LABEL"
          :placeholder="t(`rating.default.${value}`)"
          :aria-label="t('rating.nameFor', { level: value })"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <UButton color="primary" block :loading="busy" :disabled="!dirty" @click="commit">
        {{ t('card.save') }}
      </UButton>
      <UButton v-if="customised" color="neutral" variant="ghost" :loading="busy" @click="reset">
        {{ t('rating.reset') }}
      </UButton>
    </div>
  </div>
</template>
