export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    'nuxt-auth-utils',
    'motion-v/nuxt',
    '@nuxt/eslint',
    '@nuxt/test-utils/module'
  ],

  // Nuxt 4 layout: app code in app/, server code in server/, isomorphic code in shared/.
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        // A mandarin lifted from icon-park-outline and recoloured, not drawn
        // here. Regenerate with scripts/build-favicon.ts if the icon changes.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  devtools: { enabled: true },

  // Must stay at or after 2025-07-15 so Nitro selects the Cloudflare dev preset,
  // which is what populates event.context.cloudflare.env during nuxt dev.
  compatibilityDate: '2026-09-01',

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      // Nitro reads the root wrangler.jsonc, merges its own main and assets entries,
      // and writes the result to .output/server/wrangler.json at build time.
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        /*
         * Workers AI, for one job only: translating a card's English meaning
         * into Vietnamese, cached per word so it costs one inference ever.
         *
         * It lives here rather than in wrangler.jsonc because this object is
         * merged into the generated deploy config and is never shown to the dev
         * emulator. Workers AI has no local emulation, and an "ai" block in
         * wrangler.jsonc makes miniflare fail to build the environment during
         * `pnpm dev`, taking D1 and R2 down with it.
         *
         * So the binding exists in the deployed worker and is absent locally,
         * which is what tryWorkersAi and every caller already handle.
         */
        ai: { binding: 'AI' }
      }
    }
  },

  runtimeConfig: {
    // Name of the D1 database as declared in wrangler.jsonc. Read by scripts, never by handlers.
    d1DatabaseName: 'juka',
    public: {
      releaseCodename: 'ponkan'
    }
  },

  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt', file: 'vi.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'juka_locale',
      redirectOn: 'root'
    }
  },

  icon: {
    // Icons resolve from the locally installed collections, never the Iconify API,
    // so a deployed worker makes no outbound call to render a button.
    serverBundle: 'local',
    clientBundle: { scan: true }
  },

  typescript: {
    typeCheck: false,
    strict: true
  }
})
