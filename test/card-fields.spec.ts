import { describe, expect, it } from 'vitest'
import { buildSearchMatch, deriveCardFields } from '../server/utils/card-fields'

describe('deriveCardFields', () => {
  it('derives pinyin from the hanzi when none is supplied', () => {
    const derived = deriveCardFields('时间')

    expect(derived.pinyin).toBe('shí jiān')
    expect(derived.pinyinPlain).toBe('shijian')
    expect(derived.syllables).toBe(2)
  })

  it('keeps pinyin the user typed, because tone choices are theirs', () => {
    const derived = deriveCardFields('时间', 'shí jiān (formal)')

    expect(derived.pinyin).toBe('shí jiān (formal)')
    // The search columns still come from the hanzi, so they cannot drift.
    expect(derived.pinyinPlain).toBe('shijian')
  })

  it('separates characters so a standard FTS5 tokenizer can index CJK', () => {
    expect(deriveCardFields('时间').hanziChars).toBe('时 间')
    expect(deriveCardFields('不好意思').hanziChars).toBe('不 好 意 思')
  })

  it('indexes the joined pinyin and each syllable, so jian finds shijian', () => {
    expect(deriveCardFields('时间').pinyinSearch).toBe('shijian shi jian')
  })

  it('counts only Han characters as syllables', () => {
    expect(deriveCardFields('就').syllables).toBe(1)
    expect(deriveCardFields('图书馆').syllables).toBe(3)
  })
})

describe('buildSearchMatch', () => {
  it('turns a Han run into a phrase, which is what matches short words', () => {
    expect(buildSearchMatch('时间')).toBe('"时 间"')
  })

  it('matches a single character', () => {
    expect(buildSearchMatch('就')).toBe('"就"')
  })

  it('turns Latin text into a prefix term', () => {
    expect(buildSearchMatch('shi')).toBe('shi*')
    expect(buildSearchMatch('Library')).toBe('library*')
  })

  it('ANDs a mixed query', () => {
    expect(buildSearchMatch('时间 time')).toBe('"时 间" time*')
  })

  it('strips FTS5 syntax instead of letting it reach the query', () => {
    // Only Han runs and alphanumeric runs are extracted, so quotes, dashes and
    // equals signs never survive. Operators come back lowercased, and FTS5
    // only treats OR, AND, NOT and NEAR as operators in uppercase, so they
    // land as ordinary terms.
    expect(buildSearchMatch('" OR 1=1 --')).toBe('or* 1* 1*')
    expect(buildSearchMatch('NEAR("a" "b")')).toBe('near* a* b*')

    for (const injection of ['" OR 1=1 --', 'NEAR("a" "b")', 'a* OR b']) {
      const match = buildSearchMatch(injection) ?? ''
      expect(match).not.toContain('"')
      expect(match).not.toMatch(/\b(OR|AND|NOT|NEAR)\b/)
    }
  })

  it('returns null when there is nothing searchable', () => {
    expect(buildSearchMatch('   ')).toBeNull()
    expect(buildSearchMatch('***')).toBeNull()
  })
})
