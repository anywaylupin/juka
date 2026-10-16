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
 *
 * A name saves when you leave its field, the way every other setting in the app applies at once; there was a Save button, and it was the loudest thing on the profile.
 */
const { t } = useI18n();
const toast = useToast();
const { labels, customized, save } = useRatingLabels();

const draft = ref<string[]>([...labels.value]);
const busy = ref(false);

watch(labels, (value) => {
  draft.value = [...value];
});

const dirty = computed(() => draft.value.some((value, index) => value !== labels.value[index]));

/** Which level last saved, for a quiet check beside its field rather than a toast. */
const savedLevel = ref<number | null>(null);
let clearSaved: ReturnType<typeof setTimeout> | undefined;

async function commit(level: number) {
  if (!dirty.value) {
    return;
  }
  busy.value = true;
  try {
    await save(draft.value);
    savedLevel.value = level;
    clearTimeout(clearSaved);
    clearSaved = setTimeout(() => {
      savedLevel.value = null;
    }, 1600);
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
    <div class="space-y-2" aria-live="polite">
      <div v-for="value in RATING_VALUES" :key="value" class="flex items-center gap-3">
        <!-- The mandarins, so it is obvious which level is being renamed. -->
        <div class="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          <UIcon
            v-for="pip in RATING_VALUES"
            :key="pip"
            :name="RATING_ICON"
            class="size-3.5"
            :class="pip <= value ? 'text-rating' : 'text-dimmed'"
          />
        </div>

        <UInput
          v-model="draft[value]"
          size="sm"
          class="flex-1"
          :maxlength="MAX_RATING_LABEL"
          :placeholder="t(`rating.default.${value}`)"
          :aria-label="t('rating.nameFor', { level: value })"
          @blur="commit(value)"
          @keydown.enter="commit(value)"
        />
        <UIcon
          name="i-lucide-check"
          class="size-4 shrink-0 text-muted transition-opacity"
          :class="savedLevel === value ? 'opacity-100' : 'opacity-0'"
          :aria-label="savedLevel === value ? t('rating.saved') : undefined"
        />
      </div>
    </div>

    <div v-if="customized" class="flex">
      <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-rotate-ccw" :loading="busy" @click="reset">
        {{ t('rating.reset') }}
      </UButton>
    </div>
  </div>
</template>
