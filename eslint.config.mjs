import prettier from 'eslint-config-prettier/flat';
import withNuxt from './.nuxt/eslint.config.mjs';

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
  // Prettier owns formatting, so every rule about how the code looks is turned
  // off here rather than argued with. Anything left in ESLint is about what the
  // code does. This has to stay last: it only removes rules the blocks above
  // may have switched on.
  .append(prettier);
