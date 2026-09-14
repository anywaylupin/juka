import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'vue/multi-word-component-names': 'error',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    // Page filenames are routes, so Nuxt's index.vue convention wins here.
    // The rule still holds for everything in app/components.
    files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue', 'app/app.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
