import { RATING_WEIGHTS, type Rating } from '#shared/constants/rating'
import type { CardRecord } from '#shared/types/card'

/**
 * Shuffles a filtered list so weakly known cards come up more often.
 *
 * **This is the one place in Juka where a stored value decides what you see
 * next, and it is worth being explicit about the line it walks.** The brief
 * rules out spaced repetition, and this is not that: there is no schedule, no
 * due date, no interval, and no memory of when a card was last seen. It is a
 * shuffle with a thumb on the scale, it applies only inside the stack view, and
 * reloading gives a different order.
 *
 * The weights live in RATING_WEIGHTS: an unrated or new card is dealt eight
 * times as often as a mastered one. Steep enough to be useful, shallow enough
 * that a mastered card still turns up and can be demoted when it turns out you
 * had forgotten it.
 *
 * Implemented as a weighted shuffle rather than weighted sampling, so every
 * card appears exactly once per pass. Sampling with replacement would show the
 * same weak card three times in a row and never reach the end of the box.
 */
export function usePracticeOrder(source: Ref<CardRecord[]>, enabled: Ref<boolean>) {
  /** Bumped to reshuffle without changing the filters. */
  const seed = ref(0)

  const ordered = computed<CardRecord[]>(() => {
    if (!enabled.value) {
      return source.value
    }

    // Referenced so a reshuffle re-runs this computed.
    void seed.value

    /*
     * Efraimidis-Spirakis: give each item a key of random^(1/weight) and sort
     * descending. A heavier item tends to draw a higher key, so it lands
     * earlier, but any item can still come first. One pass, no replacement, and
     * the whole list is covered.
     */
    return source.value
      .map(card => ({
        card,
        key: Math.random() ** (1 / (RATING_WEIGHTS[card.rating as Rating] ?? 1))
      }))
      .sort((a, b) => b.key - a.key)
      .map(entry => entry.card)
  })

  function reshuffle() {
    seed.value += 1
  }

  return { ordered, reshuffle }
}
