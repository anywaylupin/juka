import prettier from 'eslint-config-prettier/flat';
import unicorn from 'eslint-plugin-unicorn';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    rules: {
      'vue/multi-word-component-names': 'error',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    /**
     * Modern JavaScript, enforced rather than remembered.
     *
     * Only the rules that say "the language has a better way to write this now" are on, one by one rather than through
     * unicorn's recommended set, which also has opinions about naming and file names that are not ours to adopt.
     */
    plugins: { unicorn },
    rules: {
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/throw-new-error': 'error'
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
  // Prettier owns formatting, so every rule about how the code looks is turned off here rather than argued with.
  // Anything left in ESLint is about what the code does.
  // This has to stay last: it only removes rules the blocks above may have switched on.
  .append(prettier);
