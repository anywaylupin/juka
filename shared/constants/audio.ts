/**
 * Card audio is always Mandarin. This is deliberately a constant and not a
 * setting, and it is never derived from the i18n locale: a Vietnamese interface
 * reading Chinese text in a Vietnamese voice would be useless.
 */
export const CARD_AUDIO_LOCALE = 'zh-CN';

/** Slightly under natural pace, which is what a learner needs. */
export const CARD_AUDIO_RATE = 0.85;
