export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/i18n', 'nuxt-auth-utils', 'motion-v/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module'],

  // Nuxt 4 layout: app code in app/, server code in server/, isomorphic code in shared/.
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        // A mandarin lifted from icon-park-outline and recoloured, not drawn here.
        // Regenerate with scripts/build-favicon.ts if the icon changes.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  devtools: { enabled: true },

  // Must stay at or after 2025-07-15 so Nitro selects the Cloudflare dev preset, which is what populates event.context.cloudflare.env during nuxt dev.
  compatibilityDate: '2026-09-01',

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      // Nitro reads the root wrangler.jsonc, merges its own main and assets entries, and writes the result to .output/server/wrangler.json at build time.
      deployConfig: true,
      nodeCompat: true
    }
  },

  runtimeConfig: {
    // Name of the D1 database as declared in wrangler.jsonc. Read by scripts, never by handlers.
    d1DatabaseName: 'juka',
    /**
     * The one email the app sends is a password reset, and it needs a provider.
     * Both empty means the reset link is written to the server log instead, which is what development wants and what a missing key in production has to be visible as.
     */
    resendApiKey: '',
    mailFrom: '',
    /**
     * Client ids and secrets for the sign-in providers, read by nuxt-auth-utils.
     * The module declares these keys itself; they are repeated here so the shape is visible in one place and so `NUXT_OAUTH_GITHUB_CLIENT_ID` and friends have somewhere to land.
     */
    oauth: {
      github: { clientId: '', clientSecret: '' },
      google: { clientId: '', clientSecret: '' }
    },
    public: {
      releaseCodename: 'ponkan',
      /**
       * Where this deployment lives, for the one link that cannot be built from the request.
       * A Host header is attacker controlled, and a password reset link is the last place to trust one. Empty falls back to the request origin, which is correct in development.
       */
      siteUrl: ''
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
    // Icons resolve from the locally installed collections, never the Iconify API, so a deployed worker makes no outbound call to render a button.
    serverBundle: 'local',
    clientBundle: { scan: true }
  },

  typescript: {
    typeCheck: false,
    strict: true
  }
});
