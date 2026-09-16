import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    /*
     * Node, not the Nuxt environment.
     *
     * Everything under test/ is a pure function or a zod schema: derived card fields, the FTS match builder, the part of speech list.
     * None of it needs a Nuxt app, and booting one cost every file a `setupNuxt()` call that routinely exceeded the default 10s hook timeout and failed the whole suite before a single assertion ran.
     *
     * A test that genuinely needs the app opts back in per file with a `// @vitest-environment nuxt` docblock, and the raised hook timeout below gives that boot room to finish.
     */
    environment: 'node',
    hookTimeout: 60_000,
    include: ['test/**/*.spec.ts']
  }
});
