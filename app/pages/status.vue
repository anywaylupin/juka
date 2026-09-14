<script setup lang="ts">
import type { HealthResponse } from '#shared/types/health'

definePageMeta({ name: 'status' })

const { t } = useI18n()

useSeoMeta({
  title: () => `${t('health.title')} - Juka`,
  description: 'Connection check for D1 and R2'
})

const { data: health, status, error, refresh } = await useFetch<HealthResponse>('/api/health', {
  query: { probe: 'all' }
})

const probes = computed(() => [
  { key: 'D1', label: t('health.database'), probe: health.value?.database ?? null },
  { key: 'R2', label: t('health.storage'), probe: health.value?.storage ?? null }
])
</script>

<template>
  <div class="space-y-5">
    <h1 class="text-2xl font-bold">
      {{ t('health.title') }}
    </h1>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <span class="font-medium">{{ health?.service ?? 'juka' }}</span>
          <UBadge
            :color="health?.ok ? 'success' : 'error'"
            variant="subtle"
          >
            {{ health?.ok ? t('health.ok') : t('health.failing') }}
          </UBadge>
        </div>
      </template>

      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error.message }}
      </p>

      <dl
        v-else
        class="space-y-3 text-sm"
      >
        <div
          v-for="entry in probes"
          :key="entry.key"
          class="flex items-start justify-between gap-4"
        >
          <dt class="font-bold text-highlighted">
            {{ entry.key }}
            <span class="block text-xs font-normal text-dimmed">{{ entry.label }}</span>
          </dt>
          <dd class="text-right">
            <span :class="entry.probe?.ok ? 'text-status-mastered' : 'text-error'">
              {{ entry.probe?.detail ?? '-' }}
            </span>
            <span
              v-if="entry.probe"
              class="block text-xs text-[var(--ui-text-dimmed)]"
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
          class="juka-press"
          @click="refresh()"
        >
          {{ t('health.recheck') }}
        </UButton>
      </template>
    </UCard>
  </div>
</template>
