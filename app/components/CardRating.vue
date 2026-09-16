<script setup lang="ts">
import { RATING_ICON, RATING_VALUES, type Rating } from '#shared/constants/rating';

const props = withDefaults(
  defineProps<{
    modelValue: Rating;
    /** Read only, for a card seen in passing. */
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    readonly: false,
    size: 'md'
  }
);

const emit = defineEmits<{ 'update:modelValue': [value: Rating] }>();

const { t } = useI18n();
const { labelFor } = useRatingLabels();

const sizeClass = computed(
  () =>
    ({
      sm: 'size-3.5',
      md: 'size-5',
      lg: 'size-7'
    })[props.size]
);

/** Tapping the mandarin you are already on clears the rating back to unrated. */
function choose(value: Rating) {
  emit('update:modelValue', props.modelValue === value ? 0 : value);
}
</script>

<template>
  <div
    v-if="readonly"
    class="flex items-center gap-0.5"
    :aria-label="modelValue ? labelFor(modelValue) : t('filter.unrated')"
  >
    <UIcon
      v-for="value in RATING_VALUES"
      :key="value"
      :name="RATING_ICON"
      :class="[sizeClass, value <= modelValue ? 'text-[var(--color-rating)]' : 'text-muted opacity-25']"
    />
  </div>

  <div v-else class="flex items-center gap-0.5" role="radiogroup" :aria-label="t('rating.label')">
    <!--
      One tooltip per mandarin, naming what that level means rather than just
      its number. The scale is the user's own judgement, so the wording is about
      recall and not about being correct.
    -->
    <UTooltip v-for="value in RATING_VALUES" :key="value" :text="labelFor(value)">
      <button
        type="button"
        role="radio"
        :aria-checked="modelValue === value"
        :aria-label="labelFor(value)"
        class="rounded-full p-0.5 transition-transform duration-150 hover:scale-125"
        @pointerdown.stop
        @click.stop="choose(value)"
      >
        <UIcon
          :name="RATING_ICON"
          :class="[sizeClass, value <= modelValue ? 'text-[var(--color-rating)]' : 'text-muted opacity-25']"
        />
      </button>
    </UTooltip>
  </div>
</template>
