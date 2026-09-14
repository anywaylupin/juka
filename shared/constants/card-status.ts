import type { CardStatus } from '../types/card'

/**
 * A ripening scale, from unripe through gold, with a leaf green for mastered
 * that sits deliberately off the fruit scale.
 *
 * These four colours are fixed. They do not change with the theme and no
 * theme's primary colour may be used for a status, because the user has to be
 * able to tell a button from a state.
 */
export interface CardStatusDefinition {
  value: CardStatus
  colour: string
  /** Tailwind text colour class, from the @theme tokens in main.css. */
  textClass: string
  bgClass: string
  reading: string
}

export const CARD_STATUS_LIST = [
  { value: 'difficult', colour: '#7a9a3c', textClass: 'text-status-difficult', bgClass: 'bg-status-difficult', reading: 'unripe' },
  { value: 'hesitant', colour: '#c9ba2e', textClass: 'text-status-hesitant', bgClass: 'bg-status-hesitant', reading: 'turning' },
  { value: 'good', colour: '#e8a317', textClass: 'text-status-good', bgClass: 'bg-status-good', reading: 'gold' },
  { value: 'mastered', colour: '#2f7d52', textClass: 'text-status-mastered', bgClass: 'bg-status-mastered', reading: 'leaf' }
] as const satisfies readonly CardStatusDefinition[]

export const CARD_STATUS_COLOURS: Record<CardStatus, string> = {
  difficult: '#7a9a3c',
  hesitant: '#c9ba2e',
  good: '#e8a317',
  mastered: '#2f7d52'
}
