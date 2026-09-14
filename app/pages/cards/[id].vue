<script setup lang="ts">
import type { CardRecord, CardStatus, UnitListResponse } from '#shared/types/card'

definePageMeta({ name: 'card-detail' })

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t } = useI18n()
const toast = useToast()
const { speak, supported: speechSupported } = useSpeech()
const { visible: hanVietVisible, toggle: toggleHanViet } = useHanViet()

const id = computed(() => Number(route.params.id))

const { data: card, refresh } = await useFetch<CardRecord>(() => `/api/cards/${id.value}`)

if (!card.value) {
  throw createError({ statusCode: 404, statusMessage: 'Card not found' })
}

useSeoMeta({
  title: () => (card.value ? `${card.value.hanzi} - Juka` : 'Juka'),
  description: () => card.value?.translation ?? ''
})

const { data: unitsData } = await useFetch<UnitListResponse>('/api/units')
const units = computed(() => unitsData.value?.items ?? [])

const flipped = ref(false)
const editOpen = ref(false)
const savingStatus = ref(false)
const deleting = ref(false)

async function setStatus(status: CardStatus) {
  if (!card.value || card.value.status === status) {
    return
  }

  savingStatus.value = true
  try {
    card.value = await $fetch<CardRecord>(`/api/cards/${id.value}`, {
      method: 'PATCH',
      body: { status }
    })
  }
  catch {
    toast.add({ title: t('card.notSaved'), color: 'error' })
  }
  finally {
    savingStatus.value = false
  }
}

async function remove() {
  if (!confirm(t('card.confirmDelete'))) {
    return
  }

  deleting.value = true
  try {
    await $fetch(`/api/cards/${id.value}`, { method: 'DELETE' })
    toast.add({ title: t('card.deleted'), color: 'success' })
    await router.push(localePath('/'))
  }
  catch {
    toast.add({ title: t('card.notDeleted'), color: 'error' })
    deleting.value = false
  }
}

async function onSaved() {
  editOpen.value = false
  await refresh()
  toast.add({ title: t('card.updated'), color: 'success' })
}
</script>

<template>
  <div
    v-if="card"
    class="space-y-6"
  >
    <UButton
      :to="localePath('/')"
      icon="i-icon-park-outline-left"
      color="neutral"
      variant="ghost"
      size="sm"
    >
      {{ t('nav.cards') }}
    </UButton>

    <!-- The card face. Tap to turn it over. -->
    <div
      class="[perspective:1400px]"
      @click="flipped = !flipped"
    >
      <Motion
        :animate="{ rotateY: flipped ? 180 : 0 }"
        :transition="{ type: 'spring', stiffness: 240, damping: 26 }"
        class="relative min-h-72 w-full cursor-pointer [transform-style:preserve-3d]"
      >
        <div
          class="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--ui-border)] border-b-8 border-b-primary-200 bg-[var(--ui-bg)] p-8 text-center [backface-visibility:hidden]"
        >
          <p class="font-hanzi text-7xl leading-none text-[var(--ui-text-highlighted)] sm:text-8xl">
            {{ card.hanzi }}
          </p>
          <p class="text-xl text-[var(--ui-text-muted)]">
            {{ card.pinyin }}
          </p>
          <p
            v-if="hanVietVisible && card.hanViet"
            class="text-lg italic text-primary-600"
          >
            {{ card.hanViet }}
          </p>
          <p class="mt-2 text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">
            {{ t('card.tapToTurn') }}
          </p>
        </div>

        <div
          class="absolute inset-0 flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--ui-border)] border-b-8 border-b-primary-200 bg-[var(--ui-bg)] p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <p class="text-2xl font-medium text-[var(--ui-text-highlighted)]">
            {{ card.translation || t('card.noTranslation') }}
          </p>
          <p
            v-if="card.pos"
            class="text-sm text-[var(--ui-text-muted)]"
          >
            {{ card.pos }}
          </p>
          <p
            v-if="card.notes"
            class="mt-2 max-w-md whitespace-pre-line text-sm text-[var(--ui-text-toned)]"
          >
            {{ card.notes }}
          </p>
        </div>
      </Motion>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="speechSupported"
        icon="i-icon-park-outline-volume-notice"
        color="primary"
        variant="soft"
        size="lg"
        class="juka-press"
        @click="speak(card.hanzi)"
      >
        {{ t('card.listen') }}
      </UButton>

      <UButton
        icon="i-icon-park-outline-editor"
        color="neutral"
        variant="soft"
        size="lg"
        @click="editOpen = true"
      >
        {{ t('card.edit') }}
      </UButton>

      <UButton
        v-if="card.hanViet"
        icon="i-icon-park-outline-translate"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="toggleHanViet"
      >
        {{ t('card.hanViet') }}
      </UButton>

      <UButton
        icon="i-icon-park-outline-delete"
        color="error"
        variant="ghost"
        size="lg"
        class="ml-auto"
        :loading="deleting"
        @click="remove"
      >
        {{ t('common.delete') }}
      </UButton>
    </div>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-[var(--ui-text-muted)]">
        {{ t('card.status') }}
      </h2>
      <CardStatusPicker
        :model-value="card.status"
        :disabled="savingStatus"
        @update:model-value="setStatus"
      />
    </section>

    <dl class="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-[var(--ui-text-dimmed)]">
          {{ t('card.unit') }}
        </dt>
        <dd class="mt-0.5 font-medium">
          {{ card.unitName ?? t('card.noUnit') }}
        </dd>
      </div>
      <div>
        <dt class="text-[var(--ui-text-dimmed)]">
          {{ t('card.hskLevel') }}
        </dt>
        <dd class="mt-0.5 font-medium">
          {{ card.hskLevel ? `HSK ${card.hskLevel}` : '-' }}
        </dd>
      </div>
      <div>
        <dt class="text-[var(--ui-text-dimmed)]">
          {{ t('card.syllables') }}
        </dt>
        <dd class="mt-0.5 font-medium">
          {{ card.syllables }}
        </dd>
      </div>
      <div>
        <dt class="text-[var(--ui-text-dimmed)]">
          {{ t('card.added') }}
        </dt>
        <dd class="mt-0.5 font-medium">
          {{ new Date(card.createdAt).toLocaleDateString() }}
        </dd>
      </div>
    </dl>

    <USlideover
      v-model:open="editOpen"
      :title="t('card.edit')"
    >
      <template #body>
        <CardForm
          :card="card"
          :units="units"
          @saved="onSaved"
          @cancel="editOpen = false"
        />
      </template>
    </USlideover>
  </div>
</template>
