export default defineAppConfig({
  ui: {
    /*
     * Ponkan is the default. The live values are repointed per theme in
     * app/assets/css/themes.css, which is what the theme switcher drives.
     */
    colors: {
      primary: 'ponkan',
      neutral: 'taupe'
    },
    button: {
      // The 3D press, applied once rather than per component.
      slots: {
        base: 'juka-press font-semibold'
      },
      defaultVariants: {
        size: 'md'
      }
    },
    card: {
      slots: {
        root: 'rounded-2xl'
      }
    }
  }
})
