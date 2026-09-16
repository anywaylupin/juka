<script setup lang="ts">
import { partOfSpeechColour } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord, DictionaryEntry } from '#shared/types/card';

/**
 * Writing a card, shaped like the card it writes.
 *
 * One field. Type pinyin or hanzi and the reading, the meaning and the part of
 * speech arrive with the dictionary entry. None of those three is an input any
 * more: they are looked up, so they are shown on the card rather than offered
 * as boxes to fill in and get wrong.
 *
 * What is left for the user is the rating and the note, which sit in the bottom
 * corners where a thumb reaches.
 */
const props = defineProps<{
  card?: CardRecord | null;
}>();

const emit = defineEmits<{
  saved: [card: CardRecord];
  cancel: [];
}>();

const { t, locale } = useI18n();
const toast = useToast();
const { speak, supported: speechSupported } = useSpeech();
const { define } = useDictionary();
const store = useCardStore();
const { groups } = useGroups();

interface FormState {
  hanzi: string;
  pinyin: string;
  translationVi: string;
  translation: string;
  pos: CardRecord['pos'];
  rating: Rating;
  notes: string;
  groupIds: number[];
  /** Offered under the hanzi once a word is settled on, never stored. */
  synonyms: string[];
}

function initialState(): FormState {
  return {
    hanzi: props.card?.hanzi ?? '',
    pinyin: props.card?.pinyin ?? '',
    translationVi: props.card?.translationVi ?? '',
    translation: props.card?.translation ?? '',
    pos: props.card?.pos ?? null,
    rating: props.card?.rating ?? 0,
    notes: props.card?.notes ?? '',
    groupIds: props.card?.groupIds ? [...props.card.groupIds] : [],
    synonyms: []
  };
}

const state = reactive<FormState>(initialState());
const saving = ref(false);

watch(
  () => props.card,
  () => Object.assign(state, initialState())
);

/**
 * A card says what it means in one language: the one the interface is in.
 *
 * Both meanings are stored, and both used to be shown here at once, which made
 * the editor the only place in the app that contradicted that rule and left a
 * Vietnamese reader reading English anyway.
 *
 * The Vietnamese one is editable where the English is not, because it is
 * pivoted through the English gloss and a homograph pivots wrong: 爱好 "to
 * like" lands on giống, meaning "similar". Where the pivot found nothing the
 * English is shown underneath rather than a blank field, since a meaning you
 * can read beats a box you have to fill.
 *
 * Han-Viet has been taken off the card for now. The column and its data are
 * still there, and `docs/licences.md` still records where the readings come
 * from; only the field is gone.
 */
const showVietnamese = computed(() => locale.value === 'vi');
const posColour = computed(() => partOfSpeechColour(state.pos));

/** Everything the dictionary knows, straight onto the card. */
function applyEntry(entry: DictionaryEntry | null) {
  if (!entry) {
    return;
  }
  state.pinyin = entry.pinyin;
  state.translation = entry.gloss;
  state.pos = entry.pos;
  state.synonyms = entry.synonyms;

  // Only fills a blank, so a wording the user corrected survives a later
  // lookup that would otherwise overwrite it.
  if (entry.vi && !state.translationVi.trim()) {
    state.translationVi = entry.vi;
  }
}

// A card written before a dictionary rebuild may be missing a reading.
onMounted(async () => {
  if (state.hanzi && (!state.pinyin || !state.pos)) {
    applyEntry(await define(state.hanzi));
  }
});

/** Swaps the form over to a synonym, so one card leads to the next. */
async function useSynonym(hanzi: string) {
  state.hanzi = hanzi;
  state.translationVi = '';
  applyEntry(await define(hanzi));
}

function toggleGroup(id: number) {
  state.groupIds = state.groupIds.includes(id)
    ? state.groupIds.filter((entry) => entry !== id)
    : [...state.groupIds, id];
}

async function submit() {
  if (!state.hanzi.trim()) {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      hanzi: state.hanzi,
      pinyin: state.pinyin.trim() || undefined,
      translationVi: state.translationVi.trim() || null,
      translation: state.translation,
      pos: state.pos,
      rating: state.rating,
      notes: state.notes.trim() || null,
      groupIds: state.groupIds
    };

    const saved = props.card ? await store.update(props.card.id, payload) : await store.add(payload);

    toast.add({
      title: props.card ? t('card.updated') : t('card.added'),
      icon: 'i-lucide-check',
      color: 'success'
    });
    emit('saved', saved);
  } catch (error) {
    // A duplicate word is the common failure and it has a useful message, so
    // it is shown rather than replaced with something generic.
    const message =
      (error as { data?: { message?: string } })?.data?.message ?? (error instanceof Error ? error.message : undefined);

    toast.add({
      title: t('card.notSaved'),
      description: message,
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="rounded-2xl bg-default p-4 ring ring-default">
      <div class="flex min-h-56 flex-col items-center justify-center gap-3">
        <HanziInput v-model="state.hanzi" autofocus @resolve="applyEntry" />

        <template v-if="state.hanzi">
          <div class="flex items-center gap-1.5">
            <p class="text-lg text-muted">
              {{ state.pinyin }}
            </p>
            <UTooltip v-if="speechSupported" :text="t('card.listen')">
              <UButton
                icon="i-lucide-volume-2"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="t('card.listen')"
                @click="speak(state.hanzi)"
              />
            </UTooltip>
          </div>

          <!--
            Looked up, so shown rather than offered as a field. Under the
            Vietnamese locale this is the fallback rather than the answer, and
            it only appears when the pivot found no Vietnamese.
          -->
          <p
            v-if="!showVietnamese || !state.translationVi.trim()"
            class="text-center text-base font-semibold text-highlighted"
            :class="showVietnamese && 'text-muted'"
          >
            {{ state.translation || t('card.noTranslation') }}
          </p>

          <span
            v-if="state.pos"
            class="rounded-full px-2 py-0.5 text-xs font-semibold"
            :style="{
              color: posColour,
              backgroundColor: `color-mix(in oklab, ${posColour} 14%, transparent)`
            }"
            >{{ t(`pos.${state.pos}`) }}</span
          >

          <!--
            The Vietnamese meaning, filled from the dictionary and editable.
            This is the card's meaning under the Vietnamese locale, not an
            extra line beneath the English one.
          -->
          <UInput
            v-if="showVietnamese"
            v-model="state.translationVi"
            variant="none"
            class="w-full"
            :placeholder="t('card.translationViPlaceholder')"
            :ui="{ base: 'text-center text-base font-semibold text-highlighted' }"
          />

          <!--
            Words that mean close to the same thing, from the bundled
            dictionary rather than a model: two words sharing an English gloss
            are near synonyms. Tapping one swaps the card over to it, so a
            session of adding words can follow a thread.
          -->
          <div v-if="state.synonyms.length" class="flex flex-wrap items-center justify-center gap-1 pt-1">
            <span class="text-xs text-dimmed">{{ t('card.similar') }}</span>
            <UTooltip v-for="word in state.synonyms" :key="word" :text="t('card.useInstead', { hanzi: word })">
              <UButton color="neutral" variant="soft" size="xs" class="font-hanzi" @click="useSynonym(word)">
                {{ word }}
              </UButton>
            </UTooltip>
          </div>
        </template>
      </div>

      <div class="flex items-end justify-between gap-3 border-t border-default pt-3">
        <CardRating v-model="state.rating" />

        <div class="flex items-center gap-0.5">
          <UPopover v-if="groups.length">
            <UTooltip :text="t('group.title')">
              <UButton
                icon="i-lucide-tags"
                :color="state.groupIds.length ? 'primary' : 'neutral'"
                variant="ghost"
                size="sm"
                :aria-label="t('group.title')"
              />
            </UTooltip>
            <template #content>
              <div class="max-h-64 w-56 space-y-0.5 overflow-y-auto p-2">
                <button
                  v-for="group in groups"
                  :key="group.id"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-elevated"
                  :aria-pressed="state.groupIds.includes(group.id)"
                  @click="toggleGroup(group.id)"
                >
                  <span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: group.colour }" />
                  <span class="flex-1 truncate">{{ group.name }}</span>
                  <UIcon
                    v-if="state.groupIds.includes(group.id)"
                    name="i-lucide-check"
                    class="size-4 shrink-0 text-primary"
                  />
                </button>
              </div>
            </template>
          </UPopover>

          <UPopover>
            <UTooltip :text="t('card.notes')">
              <UButton
                icon="i-lucide-sticky-note"
                :color="state.notes.trim() ? 'primary' : 'neutral'"
                variant="ghost"
                size="sm"
                :aria-label="t('card.notes')"
              />
            </UTooltip>
            <template #content>
              <div class="w-72 p-2">
                <UTextarea
                  v-model="state.notes"
                  autoresize
                  :rows="3"
                  class="w-full"
                  :placeholder="t('card.notesPlaceholder')"
                />
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <UButton type="submit" :loading="saving" :disabled="!state.hanzi" color="primary" size="lg" block>
        {{ card ? t('card.save') : t('card.add') }}
      </UButton>
      <UButton color="neutral" variant="ghost" size="lg" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </UButton>
    </div>
  </form>
</template>
