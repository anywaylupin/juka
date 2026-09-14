<script setup lang="ts">
import type { HealthResponse } from '#shared/types/health'

definePageMeta({ name: 'home' })

useSeoMeta({
  title: 'Juka',
  description: 'Flashcard storage for HSK learners'
})

const { t } = useI18n()

const { data: health, status, error, refresh } = await useFetch<HealthResponse>('/api/health', {
  query: { probe: 'all' }
})

const probes = computed(() => [
  { key: 'D1', probe: health.value?.database ?? null },
  { key: 'R2', probe: health.value?.storage ?? null }
])
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 p-6">
    <header class="space-y-2">
      <h1 class="font-hanzi text-5xl text-ponkan-600">
        橘卡
      </h1>
      <p class="text-taupe-700">
        {{ t('tagline') }}
      </p>
    </header>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h2 class="font-medium">
            {{ t('health.title') }}
          </h2>
          <UBadge
            :color="health?.ok ? 'success' : 'error'"
            variant="subtle"
          >
            {{ health?.ok ? t('health.ok') : t('health.failing') }}
          </UBadge>
        </div>
      </template>

      <div
        v-if="error"
        class="text-sm text-error"
      >
        {{ error.message }}
      </div>

      <dl
        v-else
        class="space-y-3 text-sm"
      >
        <div
          v-for="entry in probes"
          :key="entry.key"
          class="flex items-start justify-between gap-4"
        >
          <dt class="font-medium">
            {{ entry.key }}
          </dt>
          <dd class="text-right text-taupe-700">
            <span :class="entry.probe?.ok ? 'text-status-mastered' : 'text-status-difficult'">
              {{ entry.probe?.detail ?? '-' }}
            </span>
            <span
              v-if="entry.probe"
              class="block text-xs text-taupe-500"
            >
              {{ entry.probe.durationMs }} ms
            </span>
          </dd>
        </div>
      </dl>

      <template #footer>
        <UButton
          :loading="status === 'pending'"
          icon="i-icon-park-outline-refresh"
          color="primary"
          @click="refresh()"
        >
          {{ t('health.recheck') }}
        </UButton>
      </template>
    </UCard>
  </main>
</template>
