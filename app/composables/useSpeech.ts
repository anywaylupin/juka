import { CARD_AUDIO_LOCALE, CARD_AUDIO_RATE } from '#shared/constants/audio'

/**
 * Tier one of the audio plan: the Web Speech API, which needs no
 * infrastructure and covers most desktop and iOS users. The Piper batch and the
 * R2 fallback come later and slot in behind the same speak() call.
 */
export function useSpeech() {
  const supported = ref(false)
  const speaking = ref(false)
  const voices = shallowRef<SpeechSynthesisVoice[]>([])

  function loadVoices() {
    voices.value = window.speechSynthesis.getVoices()
  }

  onMounted(() => {
    supported.value = 'speechSynthesis' in window
    if (!supported.value) {
      return
    }

    loadVoices()
    // Chrome populates the voice list asynchronously.
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  })

  onBeforeUnmount(() => {
    if (!supported.value) {
      return
    }
    window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    window.speechSynthesis.cancel()
  })

  const voice = computed(() =>
    voices.value.find(entry => entry.lang.replace('_', '-') === CARD_AUDIO_LOCALE)
    ?? voices.value.find(entry => entry.lang.toLowerCase().startsWith('zh'))
    ?? null
  )

  function speak(text: string) {
    if (!supported.value || !text.trim()) {
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = CARD_AUDIO_LOCALE
    utterance.rate = CARD_AUDIO_RATE
    if (voice.value) {
      utterance.voice = voice.value
    }

    utterance.addEventListener('start', () => {
      speaking.value = true
    })
    utterance.addEventListener('end', () => {
      speaking.value = false
    })
    utterance.addEventListener('error', () => {
      speaking.value = false
    })

    window.speechSynthesis.speak(utterance)
  }

  return { speak, speaking, supported, hasMandarinVoice: computed(() => voice.value !== null) }
}
