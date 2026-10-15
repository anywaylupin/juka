export default defineAppConfig({
  ui: {
    colors: {
      primary: 'tangerine',
      neutral: 'taupe'
    },

    /*
     * Nuxt UI's own rings, with one change: on focus it rings a field in the accent color and adds a translucent 3px outline on top, which on a warm palette reads as an orange glow around every box you touch.
     *
     * These lines swap that ring to neutral and drop the extra outline.
     * The ring itself stays, because a field with no focus indicator is unusable from a keyboard.
     * Nothing else about the components is overridden: this is a color correction, not a bespoke effect.
     */
    /*
     * Neutral buttons are drawn as ink chops to match the red seal of the add button: outline is a framed outline, solid is pressed in ink.
     * Behaviour is Nuxt UI's; only the look changes.
     */
    button: {
      compoundVariants: [
        { color: 'neutral', variant: 'outline', class: 'juka-ink-button ring-0' },
        { color: 'neutral', variant: 'solid', class: 'juka-ink-solid' }
      ]
    },
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
