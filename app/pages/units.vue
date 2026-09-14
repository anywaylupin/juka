<script setup lang="ts">
import type { UnitListResponse, UnitRecord } from '#shared/types/card'

definePageMeta({ name: 'units' })

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const router = useRouter()

useSeoMeta({
  title: () => `${t('nav.units')} - Juka`,
  description: 'Units of HSK flashcards'
})

const { data, refresh } = await useFetch<UnitListResponse>('/api/units')
const units = computed(() => data.value?.items ?? [])

const newName = ref('')
const creating = ref(false)

async function createUnit() {
  const name = newName.value.trim()
  if (!name) {
    return
  }

  creating.value = true
  try {
    await $fetch('/api/units', { method: 'POST', body: { name } })
    newName.value = ''
    await refresh()
  }
  catch {
    toast.add({ title: t('unit.notSaved'), color: 'error' })
  }
  finally {
    creating.value = false
  }
}

async function removeUnit(unit: UnitRecord) {
  if (!confirm(t('unit.confirmDelete', { name: unit.name }))) {
    return
  }

  try {
    await $fetch(`/api/units/${unit.id}`, { method: 'DELETE' })
    toast.add({ title: t('unit.deleted'), color: 'success' })
    await refresh()
  }
  catch {
    toast.add({ title: t('unit.notDeleted'), color: 'error' })
  }
}

/* Opening a unit is the card list filtered to it. */
const filters = useState<{ q: string, unitId?: number }>('juka:card-filters', () => ({ q: '' }))

async function openUnit(unit: UnitRecord) {
  filters.value = { q: '', unitId: unit.id }
  await router.push(localePath('/'))
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">
      {{ t('nav.units') }}
    </h1>

    <form
      class="flex gap-2"
      @submit.prevent="createUnit"
    >
      <UInput
        v-model="newName"
        size="lg"
        class="flex-1"
        :placeholder="t('unit.namePlaceholder')"
      />
      <UButton
        type="submit"
        color="primary"
        size="lg"
        class="juka-press"
        :loading="creating"
        :disabled="!newName.trim()"
      >
        {{ t('unit.add') }}
      </UButton>
    </form>

    <div
      v-if="units.length === 0"
      class="rounded-2xl border border-dashed border-[var(--ui-border-accented)] p-10 text-center"
    >
      <p class="font-medium">
        {{ t('unit.empty') }}
      </p>
      <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
        {{ t('unit.emptyHint') }}
      </p>
    </div>

    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="unit in units"
        :key="unit.id"
        class="flex items-center gap-4 rounded-2xl border border-[var(--ui-border)] border-b-4 bg-[var(--ui-bg)] p-4"
      >
        <RipenessRing
          :counts="unit.counts"
          :total="unit.total"
          :size="48"
        />

        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          @click="openUnit(unit)"
        >
          <p class="truncate font-medium">
            {{ unit.name }}
          </p>
          <p class="text-sm text-[var(--ui-text-muted)]">
            {{ t('unit.mastered', { mastered: unit.counts.mastered, total: unit.total }) }}
          </p>
        </button>

        <UButton
          icon="i-icon-park-outline-delete"
          color="neutral"
          variant="ghost"
          :aria-label="t('common.delete')"
          @click="removeUnit(unit)"
        />
      </li>
    </ul>

    <p
      v-if="data?.unfiled"
      class="text-sm text-[var(--ui-text-muted)]"
    >
      {{ t('unit.unfiled', { count: data.unfiled }) }}
    </p>
  </div>
</template>
