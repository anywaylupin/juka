/**
 * Pointer dragging for a card.
 *
 * Hand rolled on pointer events rather than pulled from a library, because the
 * whole interaction is one element following one finger and then being judged
 * against three thresholds. A drag and drop library would bring a dependency,
 * a sensor abstraction and a keyboard mode for a gesture that already has
 * buttons behind it.
 *
 * The gestures, in the order they are tested:
 *
 * - Drag right past the threshold: keep, and move on to the next card.
 * - Drag left past the threshold: bin it, with an undo.
 * - Drag up or down past the threshold, or a tap: turn the card over.
 *
 * Anything short of a threshold springs back, which is the point of a physical
 * gesture: you can always change your mind halfway.
 */
export type DragOutcome = 'keep' | 'bin' | 'flip' | 'cancel'

export interface DragState {
  x: number
  y: number
  dragging: boolean
}

export interface UseCardDragOptions {
  /** How far sideways before a release counts as keep or bin. */
  threshold?: number
  /** How far up or down before a release counts as a flip. */
  flipThreshold?: number
  /** Movement under this stays a tap, which also flips. */
  tapSlop?: number
  onOutcome: (outcome: DragOutcome) => void
  disabled?: Ref<boolean>
}

export function useCardDrag(options: UseCardDragOptions) {
  const threshold = options.threshold ?? 110
  const flipThreshold = options.flipThreshold ?? 90
  const tapSlop = options.tapSlop ?? 6

  const state = reactive<DragState>({ x: 0, y: 0, dragging: false })

  let startX = 0
  let startY = 0
  let pointerId: number | null = null

  /**
   * Which way a release would go if the finger lifted now. The interface reads
   * this to light up the matching hint, so the gesture is legible before it is
   * committed rather than only after.
   */
  const intent = computed<DragOutcome>(() => {
    if (!state.dragging) {
      return 'cancel'
    }
    if (Math.abs(state.x) >= threshold) {
      return state.x > 0 ? 'keep' : 'bin'
    }
    if (Math.abs(state.y) >= flipThreshold) {
      return 'flip'
    }
    return 'cancel'
  })

  /** 0 to 1, for fading a hint in as the threshold is approached. */
  const progress = computed(() => Math.min(1, Math.abs(state.x) / threshold))

  /** A few degrees of tilt, so the card behaves like card stock and not a div. */
  const rotation = computed(() => state.x / 18)

  function onPointerDown(event: PointerEvent) {
    if (options.disabled?.value || event.button !== 0) {
      return
    }

    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    state.dragging = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!state.dragging || event.pointerId !== pointerId) {
      return
    }

    state.x = event.clientX - startX
    state.y = event.clientY - startY
  }

  function settle(outcome: DragOutcome) {
    state.dragging = false
    state.x = 0
    state.y = 0
    pointerId = null
    options.onOutcome(outcome)
  }

  function onPointerUp(event: PointerEvent) {
    if (!state.dragging || event.pointerId !== pointerId) {
      return
    }

    const moved = Math.hypot(state.x, state.y)
    // A tap is a flip, which is what picking a card up and turning it does.
    settle(moved < tapSlop ? 'flip' : intent.value)
  }

  function onPointerCancel() {
    if (state.dragging) {
      settle('cancel')
    }
  }

  return {
    state: readonly(state),
    intent,
    progress,
    rotation,
    /*
     * Bare event names, not onPointerdown keys.
     *
     * `v-on="handlers"` compiles to Vue's toHandlers(), which prefixes every
     * key with `on` and capitalises it. An `onPointerdown` key therefore became
     * `onOnPointerdown` and bound to an event that does not exist, so the whole
     * gesture silently did nothing: no swipe, no tap to flip.
     */
    handlers: {
      pointerdown: onPointerDown,
      pointermove: onPointerMove,
      pointerup: onPointerUp,
      pointercancel: onPointerCancel
    }
  }
}
