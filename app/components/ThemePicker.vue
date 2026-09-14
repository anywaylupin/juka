<script setup lang="ts">
import type { ThemeName } from '#shared/constants/themes'

const { theme, themes, setTheme } = useJukaTheme()
const { t } = useI18n()
const toast = useToast()

const open = ref(false)

async function choose(name: ThemeName) {
  try {
    await setTheme(name)
    open.value = false
  }
  catch {
    toast.add({ title: t('theme.notSaved'), color: 'error' })
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-icon-park-outline-oranges-one"
      :aria-label="t('theme.title')"
    />

    <template #content>
      <div class="w-72 p-3">
        <p class="mb-2 px-1 text-xs font-medium text-[var(--ui-text-muted)]">
          {{ t('theme.title') }}
        </p>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="entry in themes"
            :key="entry.name"
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--ui-bg-elevated)]"
            :class="theme === entry.name && 'bg-[var(--ui-bg-elevated)] font-semibold'"
            @click="choose(entry.name)"
          >
            <span
              class="size-5 shrink-0 rounded-full border border-black/10"
              :style="{ backgroundColor: entry.primary }"
            />
            <span class="truncate">{{ entry.label }}</span>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
