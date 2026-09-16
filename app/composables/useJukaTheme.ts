import { DEFAULT_THEME, THEMES, type ThemeName } from '#shared/constants/themes';

/**
 * Theme state.
 *
 * The cookie is the source of truth for rendering, because it is readable
 * during SSR and therefore the only thing that can get the first paint right.
 * A signed in account also stores the choice, so it follows you to another
 * browser; that is a mirror of the cookie rather than a second opinion.
 *
 * Signed out, the cookie is all there is, which is the same deal as the cards.
 */
export function useJukaTheme() {
  const cookie = useCookie<ThemeName | null>('juka_theme', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    default: () => null
  });

  const theme = useState<ThemeName>('juka:theme', () => normalise(cookie.value));

  const definition = computed(() => THEMES.find((entry) => entry.name === theme.value) ?? THEMES[0]);

  const colorMode = useColorMode();

  watch(
    () => definition.value.mode,
    (mode) => {
      colorMode.preference = mode === 'dark' ? 'dark' : 'light';
    },
    { immediate: true }
  );

  // data-theme drives the colour variables, so it has to be on the html tag
  // during SSR as well or the first paint uses the wrong palette.
  useHead({
    htmlAttrs: {
      'data-theme': theme,
      'data-theme-mode': computed(() => definition.value.mode)
    }
  });

  function applyTheme(name: ThemeName | null | undefined) {
    const next = normalise(name);
    theme.value = next;
    cookie.value = next;
  }

  async function setTheme(name: ThemeName) {
    applyTheme(name);

    // Signed out there is nowhere else to put it, and that is not a failure.
    const { signedIn } = useSession();
    if (!signedIn.value) {
      return;
    }

    try {
      await $fetch('/api/preferences', { method: 'PATCH', body: { theme: name } });
    } catch {
      // The cookie already holds the choice, so the interface stays correct for
      // this browser even though it did not reach the account.
    }
  }

  return { theme, definition, themes: THEMES, setTheme, applyTheme };
}

function normalise(name: ThemeName | null | undefined): ThemeName {
  return THEMES.some((entry) => entry.name === name) ? (name as ThemeName) : DEFAULT_THEME;
}
