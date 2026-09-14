import { DEFAULT_THEME, THEMES, type ThemeName } from '#shared/constants/themes'

/**
 * Theme state. The choice is persisted per user in the database, and the mode
 * of the chosen cultivar decides light or dark, because each citrus theme is
 * one or the other rather than having both.
 */
export function useJukaTheme() {
  const theme = useState<ThemeName>('juka:theme', () => DEFAULT_THEME)
  const colorMode = useColorMode()

  const definition = computed(
    () => THEMES.find(entry => entry.name === theme.value) ?? THEMES[0]
  )

  watch(
    () => definition.value.mode,
    (mode) => {
      colorMode.preference = mode === 'dark' ? 'dark' : 'light'
    },
    { immediate: true }
  )

  // data-theme drives the colour variables, so it has to be on the html tag
  // during SSR as well or the first paint uses the wrong palette.
  useHead({
    htmlAttrs: {
      'data-theme': theme,
      'data-theme-mode': computed(() => definition.value.mode)
    }
  })

  async function setTheme(name: ThemeName) {
    const previous = theme.value
    theme.value = name

    try {
      await $fetch('/api/preferences', { method: 'PATCH', body: { theme: name } })
    }
    catch {
      // Keep the interface honest: if it did not save, do not pretend it did.
      theme.value = previous
      throw createError({ statusCode: 500, message: 'Theme was not saved' })
    }
  }

  return { theme, definition, themes: THEMES, setTheme }
}
