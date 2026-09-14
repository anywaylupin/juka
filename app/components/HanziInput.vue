<script setup lang="ts">
import type { DictionaryEntry } from '#shared/types/card'

/**
 * The hanzi field, with pinyin input built in.
 *
 * Type `shijian` and a candidate strip appears with 时间 first; pick it and the
 * field holds 时间, not the pinyin. Typing or pasting hanzi directly works too
 * and still resolves an entry, so a system IME loses nothing.
 *
 * The field's value is always hanzi. The pinyin the user typed lives in local
 * state and never leaves this component, which is what "format input to hanzi"
 * means: the model never has to wonder which it is holding.
 */
const props = defineProps<{
  modelValue: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Fired when a word is settled on, so the parent can fill the rest. */
  'resolve': [entry: DictionaryEntry | null]
}>()

const { t } = useI18n()
const { lookup, define } = useDictionary()

/** What is actually in the text box: pinyin mid-compose, or hanzi once settled. */
const draft = ref(props.modelValue)
const candidates = ref<DictionaryEntry[]>([])
const active = ref(0)
const open = ref(false)
const input = ref<HTMLInputElement | null>(null)

const HAN = /\p{Script=Han}/u

watch(() => props.modelValue, (value) => {
  if (value !== draft.value) {
    draft.value = value
  }
})

let timer: ReturnType<typeof setTimeout> | undefined
/** Guards against a slow early lookup landing after a fast later one. */
let ticket = 0

watch(draft, (value) => {
  clearTimeout(timer)

  const trimmed = value.trim()

  // Hanzi is already the finished form, so it is committed straight through and
  // only looked up to fill the meaning.
  if (HAN.test(trimmed)) {
    open.value = false
    candidates.value = []
    emit('update:modelValue', trimmed)
    resolveHanzi(trimmed)
    return
  }

  // Anything else is pinyin in progress. The bound value stays empty rather than
  // holding half a romanisation, so a half typed card can never be saved.
  emit('update:modelValue', '')

  if (!trimmed) {
    open.value = false
    candidates.value = []
    emit('resolve', null)
    return
  }

  // Short enough to feel instant, long enough that a fast typist does not fire
  // a lookup per keystroke. The shard is cached after the first one anyway.
  timer = setTimeout(() => search(trimmed), 90)
})

async function search(query: string) {
  const mine = ++ticket
  const found = await lookup(query)

  if (mine !== ticket) {
    return
  }

  candidates.value = found
  active.value = 0
  open.value = found.length > 0
}

async function resolveHanzi(hanzi: string) {
  emit('resolve', await define(hanzi))
}

/** Commits a candidate: the field becomes hanzi and the parent gets the entry. */
function choose(entry: DictionaryEntry) {
  draft.value = entry.hanzi
  candidates.value = []
  open.value = false
  emit('update:modelValue', entry.hanzi)
  emit('resolve', entry)
  input.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || candidates.value.length === 0) {
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    active.value = (active.value + 1) % candidates.value.length
  }
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    active.value = (active.value - 1 + candidates.value.length) % candidates.value.length
  }
  else if (event.key === 'Enter' || event.key === ' ') {
    // Space commits, the way it does in a real input method.
    const entry = candidates.value[active.value]
    if (entry) {
      event.preventDefault()
      choose(entry)
    }
  }
  else if (event.key === 'Escape') {
    event.preventDefault()
    open.value = false
  }
  else if (/^[1-9]$/.test(event.key)) {
    const entry = candidates.value[Number(event.key) - 1]
    if (entry) {
      event.preventDefault()
      choose(entry)
    }
  }
}

onBeforeUnmount(() => clearTimeout(timer))

/*
 * The autofocus attribute only fires for elements present at page load, so it
 * does nothing for a field inside a modal that mounts on open. Without this the
 * modal's close button keeps focus and the first thing typed goes nowhere.
 */
onMounted(() => {
  if (props.autofocus) {
    // A tick after mount, so the dialog has finished moving focus to itself.
    requestAnimationFrame(() => input.value?.focus())
  }
})

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="relative w-full">
    <input
      ref="input"
      v-model="draft"
      type="text"
      :autofocus="autofocus"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      :placeholder="t('card.hanziPlaceholder')"
      :aria-label="t('card.hanzi')"
      :aria-expanded="open"
      aria-autocomplete="list"
      role="combobox"
      :aria-controls="open ? 'hanzi-candidates' : undefined"
      class="w-full bg-transparent text-center font-hanzi text-6xl leading-tight text-highlighted outline-none placeholder:text-4xl placeholder:font-sans placeholder:text-dimmed sm:text-7xl"
      @keydown="onKeydown"
    >

    <!--
      The candidate strip, the way an input method shows it: numbered, the first
      one already selected, horizontally scrollable when there are more.
    -->
    <div
      v-if="open"
      id="hanzi-candidates"
      role="listbox"
      class="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1"
    >
      <button
        v-for="(entry, index) in candidates"
        :key="entry.hanzi + entry.pinyin"
        type="button"
        role="option"
        :aria-selected="index === active"
        class="flex shrink-0 items-baseline gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-colors"
        :class="index === active ? 'bg-primary text-inverted' : 'bg-elevated hover:bg-accented'"
        @click="choose(entry)"
      >
        <span
          class="text-xs tabular-nums"
          :class="index === active ? 'opacity-70' : 'text-dimmed'"
        >{{ index + 1 }}</span>
        <span class="font-hanzi text-xl leading-none">{{ entry.hanzi }}</span>
        <span
          class="text-xs"
          :class="index === active ? 'opacity-80' : 'text-muted'"
        >{{ entry.pinyin }}</span>
      </button>
    </div>

    <p
      v-else-if="draft.trim() && !modelValue"
      class="mt-3 text-center text-xs text-dimmed"
    >
      {{ t('card.keepTyping') }}
    </p>
  </div>
</template>
