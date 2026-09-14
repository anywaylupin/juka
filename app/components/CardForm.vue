<script setup lang="ts">
import { cardCreateSchema } from '#shared/schemas/card'
import type { CardRecord, CardStatus, UnitRecord } from '#shared/types/card'

const props = defineProps<{
  card?: CardRecord | null
  units: UnitRecord[]
}>()

const emit = defineEmits<{
  saved: [card: CardRecord]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()

interface FormState {
  hanzi: string
  pinyin: string
  hanViet: string
  translation: string
  pos: string
  hskLevel: number | undefined
  unitId: number | undefined
  status: CardStatus
  notes: string
}

function initialState(): FormState {
  return {
    hanzi: props.card?.hanzi ?? '',
    // Left blank on a new card, because pinyin is derived from the hanzi.
    pinyin: props.card?.pinyin ?? '',
    hanViet: props.card?.hanViet ?? '',
    translation: props.card?.translation ?? '',
    pos: props.card?.pos ?? '',
    hskLevel: props.card?.hskLevel ?? undefined,
    unitId: props.card?.unitId ?? undefined,
    status: props.card?.status ?? 'difficult',
    notes: props.card?.notes ?? ''
  }
}

const state = reactive<FormState>(initialState())
const saving = ref(false)

watch(() => props.card, () => Object.assign(state, initialState()))

const unitOptions = computed(() => [
  { label: t('card.noUnit'), value: undefined },
  ...props.units.map(unit => ({ label: unit.name, value: unit.id as number | undefined }))
])

const hskOptions = computed(() => [
  { label: t('card.anyLevel'), value: undefined },
  ...Array.from({ length: 9 }, (_, index) => ({
    label: `HSK ${index + 1}`,
    value: (index + 1) as number | undefined
  }))
])

/** The same zod schema the route validates with, so the rules cannot diverge. */
function validate(): string | null {
  const result = cardCreateSchema.safeParse(toPayload())
  return result.success ? null : (result.error.issues[0]?.message ?? t('card.invalid'))
}

function toPayload() {
  return {
    hanzi: state.hanzi,
    pinyin: state.pinyin.trim() || undefined,
    hanViet: state.hanViet.trim() || null,
    translation: state.translation,
    pos: state.pos.trim() || null,
    hskLevel: state.hskLevel ?? null,
    unitId: state.unitId ?? null,
    status: state.status,
    notes: state.notes.trim() || null
  }
}

async function submit() {
  const problem = validate()
  if (problem) {
    toast.add({ title: problem, color: 'error' })
    return
  }

  saving.value = true
  try {
    const saved = props.card
      ? await $fetch<CardRecord>(`/api/cards/${props.card.id}`, {
          method: 'PATCH',
          body: toPayload()
        })
      : await $fetch<CardRecord>('/api/cards', {
          method: 'POST',
          body: toPayload()
        })

    toast.add({
      title: props.card ? t('card.updated') : t('card.added'),
      color: 'success'
    })
    emit('saved', saved)
  }
  catch (error) {
    toast.add({
      title: t('card.notSaved'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form
    class="space-y-5"
    @submit.prevent="submit"
  >
    <UFormField
      :label="t('card.hanzi')"
      required
    >
      <UInput
        v-model="state.hanzi"
        size="xl"
        autofocus
        placeholder="时间"
        :ui="{ base: 'font-hanzi text-2xl' }"
      />
    </UFormField>

    <UFormField
      :label="t('card.pinyin')"
      :help="t('card.pinyinHelp')"
    >
      <UInput
        v-model="state.pinyin"
        placeholder="shí jiān"
      />
    </UFormField>

    <UFormField :label="t('card.translation')">
      <UInput
        v-model="state.translation"
        placeholder="time"
      />
    </UFormField>

    <UFormField
      :label="t('card.hanViet')"
      :help="t('card.hanVietHelp')"
    >
      <UInput
        v-model="state.hanViet"
        placeholder="thời gian"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="t('card.unit')">
        <USelectMenu
          v-model="state.unitId"
          :items="unitOptions"
          value-key="value"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('card.hskLevel')">
        <USelectMenu
          v-model="state.hskLevel"
          :items="hskOptions"
          value-key="value"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField :label="t('card.pos')">
      <UInput
        v-model="state.pos"
        placeholder="noun"
      />
    </UFormField>

    <UFormField :label="t('card.status')">
      <CardStatusPicker v-model="state.status" />
    </UFormField>

    <UFormField :label="t('card.notes')">
      <UTextarea
        v-model="state.notes"
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <div class="flex gap-3 pt-2">
      <UButton
        type="submit"
        :loading="saving"
        color="primary"
        size="lg"
        class="juka-press"
      >
        {{ card ? t('card.save') : t('card.add') }}
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </UButton>
    </div>
  </form>
</template>
