export default defineAppConfig({
  ui: {
    // Ponkan is the default theme. The other cultivars land with the theme switcher.
    colors: {
      primary: 'ponkan',
      neutral: 'taupe'
    },
    button: {
      // The 3D press, applied once here rather than per component.
      slots: {
        base: 'border-b-4 active:border-b-0 active:translate-y-1 transition-[border,transform] duration-75 font-medium'
      },
      defaultVariants: {
        size: 'lg'
      }
    }
  }
})
