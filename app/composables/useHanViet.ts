/**
 * Han-Viet shows by default for Vietnamese readers, and sits behind a toggle in
 * English. The toggle is a per viewer display preference, so it does not need
 * to reach the database the way the theme does.
 */
export function useHanViet() {
  const { locale } = useI18n()
  const override = useState<boolean | null>('juka:han-viet', () => null)

  const visible = computed(() => override.value ?? locale.value === 'vi')

  function toggle() {
    override.value = !visible.value
  }

  return { visible, toggle }
}
