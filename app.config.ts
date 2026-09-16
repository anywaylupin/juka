export default defineAppConfig({
  ui: {
    colors: {
      primary: 'ponkan',
      neutral: 'taupe'
    },

    /*
     * Nuxt UI's own rings, with one change: on focus it rings a field in the accent colour and adds a translucent 3px outline on top, which on a warm palette reads as an orange glow around every box you touch.
     *
     * These lines swap that ring to neutral and drop the extra outline.
     * The ring itself stays, because a field with no focus indicator is unusable from a keyboard.
     * Nothing else about the components is overridden: this is a colour correction, not a bespoke effect.
     */
    input: {
      slots: { base: 'focus-visible:ring-accented focus-visible:outline-none' }
    },
    textarea: {
      slots: { base: 'focus-visible:ring-accented focus-visible:outline-none' }
    },
    selectMenu: {
      slots: {
        base: 'focus-visible:ring-accented focus-visible:outline-none',
        input: 'focus-visible:ring-accented focus-visible:outline-none'
      }
    },
    inputMenu: {
      slots: {
        base: 'focus-visible:ring-accented focus-visible:outline-none',
        input: 'focus-visible:ring-accented focus-visible:outline-none'
      }
    }
  }
});
